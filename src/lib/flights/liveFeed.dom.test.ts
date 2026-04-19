// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startLiveFeed } from '@/lib/flights/liveFeed';
import type { AirlabsFlightResponse } from '@/lib/flights/airlabs';

/**
 * Happy-dom tests for the live-feed transport — exercises the WebSocket
 * path with a lightweight fake, and the polling fallback.
 */

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 0;
  onopen?: (e: Event) => void;
  onmessage?: (e: MessageEvent) => void;
  onerror?: (e: Event) => void;
  onclose?: (e: CloseEvent) => void;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
  send() {
    /* no-op */
  }
}

describe('startLiveFeed', () => {
  const originalWS = globalThis.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances.length = 0;
    // @ts-expect-error — installing a fake global
    globalThis.WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWS;
    vi.restoreAllMocks();
  });

  it('opens a WebSocket and forwards flight frames as websocket transport', () => {
    const onFlights = vi.fn();
    const onTransportChange = vi.fn();

    const handle = startLiveFeed(
      {
        pollingIntervalMs: 1000,
        backendUrl: 'http://localhost:8080',
        fetchPoll: async () => ({ flights: [], error: null }),
      },
      { onFlights, onTransportChange },
    );

    expect(FakeWebSocket.instances).toHaveLength(1);
    const ws = FakeWebSocket.instances[0];
    expect(ws.url).toBe('ws://localhost:8080/ws/flights');

    ws.open();
    expect(onTransportChange).toHaveBeenCalledWith('websocket');

    const payload: AirlabsFlightResponse[] = [{ hex: 'abc', lat: 50, lng: 8 }];
    ws.emitMessage({ type: 'flights', data: payload });

    expect(onFlights).toHaveBeenCalledTimes(1);
    expect(onFlights).toHaveBeenCalledWith(payload, 'websocket');

    handle.stop();
  });

  it('ignores non-flights WS messages', () => {
    const onFlights = vi.fn();
    const handle = startLiveFeed(
      {
        pollingIntervalMs: 1000,
        backendUrl: 'http://localhost:8080',
        fetchPoll: async () => ({ flights: [], error: null }),
      },
      { onFlights },
    );

    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.emitMessage({ type: 'geofence_alert', data: { fenceId: 1 } });
    ws.emitMessage({ type: 'flights' }); // no data array

    expect(onFlights).not.toHaveBeenCalled();
    handle.stop();
  });

  it('falls back to polling when the WS closes', async () => {
    const onTransportChange = vi.fn();
    const fetchPoll = vi.fn(async () => ({ flights: [], error: null }));

    const handle = startLiveFeed(
      {
        pollingIntervalMs: 50,
        backendUrl: 'http://localhost:8080',
        fetchPoll,
      },
      { onFlights: () => {}, onTransportChange },
    );

    const ws = FakeWebSocket.instances[0];
    ws.open();
    expect(onTransportChange).toHaveBeenCalledWith('websocket');

    ws.close();
    // After close, polling should kick in.
    await new Promise((r) => setTimeout(r, 120));

    expect(onTransportChange).toHaveBeenCalledWith('polling');
    expect(fetchPoll.mock.calls.length).toBeGreaterThanOrEqual(1);

    handle.stop();
  });

  it('surfaces polling errors via onError', async () => {
    // Remove WebSocket to force pure polling.
    // @ts-expect-error — intentional teardown
    globalThis.WebSocket = undefined;

    const onError = vi.fn();
    const handle = startLiveFeed(
      {
        pollingIntervalMs: 30,
        fetchPoll: async () => ({ flights: [], error: 'rate_limited' }),
      },
      { onFlights: () => {}, onError },
    );

    await new Promise((r) => setTimeout(r, 60));
    expect(onError).toHaveBeenCalledWith('rate_limited');
    handle.stop();
  });
});
