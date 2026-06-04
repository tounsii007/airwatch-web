/**
 * Live-feed transport logic shared by the flight store.
 *
 * Tries a backend WebSocket push first, falls back to HTTP polling when
 * the socket is unavailable or drops. Exposes a single `stop()` to tear
 * everything down.
 *
 * The backend's WS payload serializes `Aircraft` objects with Airlabs-compatible
 * JSON keys (via `@JsonProperty`), so we can feed the `data[]` array straight
 * into `buildAircraftMap()`.
 */

import type { AirlabsFlightResponse } from '@/lib/flights/airlabs';

export type FeedTransport = 'websocket' | 'polling';

/**
 * How loud an {@link LiveFeedCallbacks.onError} report should be.
 *
 *   - `'fatal'`     — the feed has never delivered a single frame, so the
 *                     map is empty and the user is genuinely looking at a
 *                     dead app. Worth a blocking, full-bleed alarm.
 *   - `'transient'` — a *secondary* fetch (the polling fallback) failed
 *                     while live data is already flowing or has flowed at
 *                     least once. The WS reconnect/backoff will recover;
 *                     this should be a quiet, auto-dismissing nudge at
 *                     most, never a red banner that contradicts the
 *                     thousands of aircraft on screen.
 */
export type FeedErrorSeverity = 'fatal' | 'transient';

/**
 * Outbound WebSocket frame the api emits on `/ws/flights`.
 *
 * Mirrors the Java {@code WsFlightFrame} record at
 * `airwatch-api/src/main/java/com/airwatch/websocket/WsFlightFrame.java`.
 * Keep the two in sync — the wire is the contract.
 *
 * `subscribed` is only present when the api filtered the data by this
 * session's icao24 subscription list (see `handleSubscribe` on the
 * backend); the unfiltered broadcast omits the field entirely.
 */
export interface WsFlightFrame {
  type: 'flights';
  count: number;
  /** ms since epoch — matches Java's System.currentTimeMillis(). */
  timestamp: number;
  subscribed?: boolean;
  data: AirlabsFlightResponse[];
}

/** Type-guard: shape-check a JSON-parsed payload against {@link WsFlightFrame}. */
function isFlightFrame(value: unknown): value is WsFlightFrame {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.type === 'flights' && Array.isArray(v.data);
}

export interface LiveFeedCallbacks {
  /** Called for every successful frame. */
  onFlights: (flights: AirlabsFlightResponse[], transport: FeedTransport) => void;
  /**
   * Called on transport-level errors. Polling fetch errors are also reported
   * here. `severity` lets the consumer pick a presentation that matches
   * reality: a `'transient'` failure happens while data is already on screen
   * (downgrade to a toast); a `'fatal'` one means nothing has ever loaded
   * (a blocking banner is warranted). Defaults to `'fatal'` for callers /
   * tests that ignore the second argument.
   */
  onError?: (error: string, severity: FeedErrorSeverity) => void;
  /** Called when the active transport changes (ws↔polling). Good for UI indicators. */
  onTransportChange?: (transport: FeedTransport) => void;
}

export interface LiveFeedOptions {
  pollingIntervalMs: number;
  backendUrl?: string;
  fetchPoll: () => Promise<{ flights: AirlabsFlightResponse[]; error: string | null }>;
}

interface Handle {
  stop: () => void;
}

export function resolveWsUrl(backendUrl: string | undefined): string | null {
  if (backendUrl) {
    return backendUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/flights';
  }
  if (typeof window === 'undefined') return null;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/flights`;
}

export function startLiveFeed(options: LiveFeedOptions, callbacks: LiveFeedCallbacks): Handle {
  let disposed = false;
  let ws: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let currentTransport: FeedTransport | null = null;
  /** Once the WS has pushed at least one frame, the initial REST snapshot
   *  (whose response may still be in flight) becomes pure waste — drop
   *  it on arrival to avoid a stale-overwrite race. */
  let firstWsFrameArrived = false;
  /** True once *any* path (snapshot, WS, or poll) has delivered a frame.
   *  Drives error severity: a poll that fails after we've shown live data
   *  is `'transient'` (the map already has aircraft); a poll that fails
   *  before anything ever loaded is `'fatal'` (genuine total outage). */
  let everDeliveredFrame = false;

  const deliver = (flights: AirlabsFlightResponse[], transport: FeedTransport) => {
    everDeliveredFrame = true;
    callbacks.onFlights(flights, transport);
  };

  // Exponential backoff for WS reconnect — previously a fixed 10 s loop
  // would hammer a down backend ~360 times/hour. Capped at 5 min so a
  // long outage doesn't drain the user's battery / mobile data while
  // polling continues to deliver frames at the regular interval.
  const BACKOFF_STEPS = [10_000, 30_000, 60_000, 120_000, 300_000];
  let reconnectAttempts = 0;

  const setTransport = (next: FeedTransport) => {
    if (currentTransport === next) return;
    currentTransport = next;
    callbacks.onTransportChange?.(next);
  };

  // ── Instant snapshot ──────────────────────────────────────────
  // The REST endpoint returns the full live aircraft map in ~500 ms.
  // Without this, the user sees an empty map for up to one full WS
  // push interval (5–180 s) on every page load — the WS handshake
  // succeeds quickly but the next broadcast can be far away. Fire
  // the REST call in parallel with the WS connect; whichever lands
  // first populates the map. The merge-on-frame logic in
  // flightStore preserves the freshest data when both arrive.
  void (async () => {
    try {
      const result = await options.fetchPoll();
      if (disposed || firstWsFrameArrived) return;
      if (result.error) return;
      deliver(result.flights, currentTransport ?? 'polling');
    } catch {
      // Fail-soft. The WS path will deliver data once it lands; if
      // both fail the existing polling fallback below handles it.
    }
  })();

  const startPolling = () => {
    if (pollTimer || disposed) return;
    setTransport('polling');

    const tick = async () => {
      try {
        const result = await options.fetchPoll();
        if (disposed) return;
        if (result.error) {
          // If live data has ever reached the user, a failed fallback poll
          // is a transient blip — the map still shows aircraft and the WS
          // reconnect loop is working in the background. Only escalate to a
          // blocking alarm when nothing has ever loaded (true cold outage).
          callbacks.onError?.(result.error, everDeliveredFrame ? 'transient' : 'fatal');
          return;
        }
        deliver(result.flights, 'polling');
      } catch (err) {
        if (disposed) return;
        const message = (err as Error).message ?? 'polling_failed';
        callbacks.onError?.(message, everDeliveredFrame ? 'transient' : 'fatal');
      }
    };

    void tick();
    pollTimer = setInterval(tick, options.pollingIntervalMs);
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const connectWs = () => {
    const url = resolveWsUrl(options.backendUrl);
    if (!url || typeof WebSocket === 'undefined') {
      startPolling();
      return;
    }

    try {
      ws = new WebSocket(url);
    } catch {
      startPolling();
      return;
    }

    ws.onopen = () => {
      // Reset backoff — a stable open means the next unexpected close
      // shouldn't inherit the previous outage's long delay.
      reconnectAttempts = 0;
      stopPolling();
      setTransport('websocket');
    };

    ws.onmessage = (event) => {
      try {
        const msg: unknown = JSON.parse(event.data);
        if (isFlightFrame(msg)) {
          firstWsFrameArrived = true;
          deliver(msg.data, 'websocket');
        }
      } catch {
        // ignore non-JSON / malformed frames
      }
    };

    ws.onerror = () => {
      // Rely on onclose for recovery; onerror fires just before.
    };

    ws.onclose = () => {
      ws = null;
      if (disposed) return;
      startPolling();
      // Exponential backoff for the reconnect — 10s → 30s → 60s → 120s → 300s,
      // reset to 10s on the next successful onopen. Polling continues to
      // deliver frames in the meantime, so the user still sees live data.
      if (reconnectTimer) return;
      const delay = BACKOFF_STEPS[Math.min(reconnectAttempts, BACKOFF_STEPS.length - 1)];
      reconnectAttempts++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!disposed && ws === null) connectWs();
      }, delay);
    };
  };

  connectWs();

  return {
    stop: () => {
      disposed = true;
      stopPolling();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      ws?.close();
      ws = null;
    },
  };
}
