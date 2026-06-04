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

  it('fires an instant REST snapshot on mount before the WS frame lands', async () => {
    const onFlights = vi.fn();
    const snapshot: AirlabsFlightResponse[] = [
      { hex: 'snap1', lat: 50.1, lng: 8.6 },
      { hex: 'snap2', lat: 51.5, lng: -0.1 },
    ];
    const fetchPoll = vi.fn(async () => ({ flights: snapshot, error: null }));

    const handle = startLiveFeed(
      {
        pollingIntervalMs: 60_000, // big enough not to fire the fallback timer
        backendUrl: 'http://localhost:8080',
        fetchPoll,
      },
      { onFlights },
    );

    // The REST snapshot resolves on a microtask tick — flush.
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchPoll).toHaveBeenCalledTimes(1);
    expect(onFlights).toHaveBeenCalledWith(snapshot, 'polling');

    handle.stop();
  });

  it('drops the late REST snapshot if the WS already pushed a frame first', async () => {
    const onFlights = vi.fn();
    let resolvePoll: (v: { flights: AirlabsFlightResponse[]; error: null }) => void = () => {};
    const fetchPoll = vi.fn(
      () => new Promise<{ flights: AirlabsFlightResponse[]; error: null }>((res) => { resolvePoll = res; }),
    );

    const handle = startLiveFeed(
      {
        pollingIntervalMs: 60_000,
        backendUrl: 'http://localhost:8080',
        fetchPoll,
      },
      { onFlights },
    );

    // WS opens and pushes BEFORE the REST call resolves.
    const ws = FakeWebSocket.instances[0];
    ws.open();
    const wsFrame: AirlabsFlightResponse[] = [{ hex: 'ws1', lat: 0, lng: 0 }];
    ws.emitMessage({ type: 'flights', data: wsFrame });

    expect(onFlights).toHaveBeenCalledTimes(1);
    expect(onFlights).toHaveBeenLastCalledWith(wsFrame, 'websocket');

    // Now the slow REST resolves. The handler must drop it so it
    // doesn't overwrite the fresher WS data.
    resolvePoll({ flights: [{ hex: 'stale', lat: 1, lng: 1 }], error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(onFlights).toHaveBeenCalledTimes(1); // still just the WS one

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
    // No frame has ever been delivered (every poll errors), so the failure
    // is fatal — the map is empty and a blocking alarm is warranted.
    expect(onError).toHaveBeenCalledWith('rate_limited', 'fatal');
    handle.stop();
  });

  it('downgrades a polling error to transient once a frame has been delivered', async () => {
    // Pure polling (no WebSocket). The first tick succeeds and paints the
    // map; a later tick fails. Because live data already reached the user,
    // the failure must be reported as transient rather than fatal.
    // @ts-expect-error — intentional teardown
    globalThis.WebSocket = undefined;

    const onError = vi.fn();
    let call = 0;
    const fetchPoll = vi.fn(async () => {
      call += 1;
      if (call === 1) return { flights: [{ hex: 'a', lat: 1, lng: 1 }], error: null as string | null };
      return { flights: [] as AirlabsFlightResponse[], error: 'proxy_error' as string | null };
    });

    const handle = startLiveFeed(
      { pollingIntervalMs: 20, fetchPoll },
      { onFlights: () => {}, onError },
    );

    await new Promise((r) => setTimeout(r, 90));
    expect(onError).toHaveBeenCalledWith('proxy_error', 'transient');
    expect(onError).not.toHaveBeenCalledWith('proxy_error', 'fatal');
    handle.stop();
  });
});
