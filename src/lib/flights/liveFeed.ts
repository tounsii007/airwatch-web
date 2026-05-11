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
  /** Called on transport-level errors. Polling fetch errors are also reported here. */
  onError?: (error: string) => void;
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
  let currentTransport: FeedTransport | null = null;
  /** Once the WS has pushed at least one frame, the initial REST snapshot
   *  (whose response may still be in flight) becomes pure waste — drop
   *  it on arrival to avoid a stale-overwrite race. */
  let firstWsFrameArrived = false;

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
      callbacks.onFlights(result.flights, currentTransport ?? 'polling');
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
          callbacks.onError?.(result.error);
          return;
        }
        callbacks.onFlights(result.flights, 'polling');
      } catch (err) {
        if (disposed) return;
        callbacks.onError?.((err as Error).message ?? 'polling_failed');
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
      stopPolling();
      setTransport('websocket');
    };

    ws.onmessage = (event) => {
      try {
        const msg: unknown = JSON.parse(event.data);
        if (isFlightFrame(msg)) {
          firstWsFrameArrived = true;
          callbacks.onFlights(msg.data, 'websocket');
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
      // Try to reconnect after 10s; while disconnected, polling keeps data flowing.
      setTimeout(() => {
        if (!disposed && ws === null) connectWs();
      }, 10_000);
    };
  };

  connectWs();

  return {
    stop: () => {
      disposed = true;
      stopPolling();
      ws?.close();
      ws = null;
    },
  };
}
