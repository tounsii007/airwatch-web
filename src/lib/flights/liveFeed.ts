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

  const setTransport = (next: FeedTransport) => {
    if (currentTransport === next) return;
    currentTransport = next;
    callbacks.onTransportChange?.(next);
  };

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
        const msg = JSON.parse(event.data) as { type?: string; data?: AirlabsFlightResponse[] };
        if (msg.type === 'flights' && Array.isArray(msg.data)) {
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
