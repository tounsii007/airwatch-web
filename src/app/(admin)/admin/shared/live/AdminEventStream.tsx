'use client';

/**
 * Single-page-wide SSE client for the admin dashboard. (Phase 4)
 *
 * <h3>Why a singleton</h3>
 * Each EventSource opens a long-lived HTTP/1.1 connection (HTTP/2
 * multiplexing helps but the server-side SseEmitter slot is still a
 * scarce resource — see {@code AdminEventPublisher.MAX_EMITTERS}). If
 * every panel opened its own EventSource we'd consume N slots per tab
 * for no reason. Instead this provider opens ONE connection per admin
 * tab and fans out the events through a React context.
 *
 * <h3>Reconnect</h3>
 * EventSource re-connects automatically on transient errors. We log
 * disconnects but never tear down the consumer registry — when the
 * connection comes back, the same handlers fire on the new events.
 *
 * <h3>Server cap</h3>
 * Backend caps concurrent SSE connections at {@code MAX_EMITTERS}. If
 * subscribe returns 503 the EventSource will retry — that's the right
 * behavior (cap is short-lived, an old connection from the same tab
 * is about to time out anyway).
 *
 * <h3>What gets pushed</h3>
 * See {@code AdminLiveEvent} in airwatch-api: alert.fired, alert.updated,
 * probe.recorded, anchor.break, heartbeat. The dashboard's panels
 * subscribe via {@link useAdminEvents}; on event arrival they typically
 * call SWR's {@code mutate(url)} to invalidate the polled cache and
 * trigger an immediate re-fetch — bridging push (event delivery) with
 * pull (the actual data load) so the existing cache machinery
 * continues to drive rendering.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/** Wire-format event names — must match {@code AdminLiveEvent.type()} in the api. */
export type AdminEventName =
  | 'alert.fired'
  | 'alert.updated'
  | 'probe.recorded'
  | 'anchor.break'
  | 'heartbeat'
  | 'hello';

/** Event handler signature — payload is the parsed JSON body of the SSE data block. */
export type AdminEventHandler<T = unknown> = (payload: T) => void;

interface RegisteredHandler {
  name: AdminEventName;
  handler: AdminEventHandler;
}

interface AdminEventStreamContext {
  /** Connection state — useful for a "live" badge in the header. */
  connected: boolean;
  /** Current SSE endpoint, exposed for diagnostics. */
  url: string;
  /**
   * Register an event handler. Returns an unsubscribe function. Multiple
   * subscribers per event-name are supported and each is called in
   * registration order.
   */
  subscribe: (name: AdminEventName, handler: AdminEventHandler) => () => void;
}

const ctx = createContext<AdminEventStreamContext | null>(null);

const STREAM_URL = '/admin/api/monitoring/events/stream';

interface ProviderProps {
  children: ReactNode;
  /**
   * Override for tests / dev. Defaults to the production endpoint.
   * Pass null to disable the stream entirely (useful for the
   * unit-test renderer in jsdom which has no EventSource polyfill).
   */
  url?: string | null;
}

export function AdminEventStreamProvider({ children, url = STREAM_URL }: ProviderProps) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Set<RegisteredHandler>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  // Stable subscribe — handlers stored in a ref-set so re-renders don't
  // cause re-subscription churn. Returns an unsubscriber for cleanup.
  const subscribe = useCallback<AdminEventStreamContext['subscribe']>((name, handler) => {
    const entry: RegisteredHandler = { name, handler: handler as AdminEventHandler };
    handlersRef.current.add(entry);
    return () => { handlersRef.current.delete(entry); };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof EventSource === 'undefined') return;
    if (!url) return;

    let stopped = false;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    function dispatch(name: AdminEventName, raw: string) {
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { payload = raw; }
      // Snapshot the handler set so a handler that subscribes/unsubscribes
      // mid-iteration doesn't perturb the loop.
      for (const reg of Array.from(handlersRef.current)) {
        if (reg.name === name) {
          try { reg.handler(payload); }
          catch (e) { console.error('admin-event handler failed', name, e); }
        }
      }
    }

    es.addEventListener('open', () => { if (!stopped) setConnected(true); });
    es.addEventListener('error', () => {
      // EventSource will auto-reconnect; we just flip the badge.
      if (!stopped) setConnected(false);
    });

    // Bind one listener per known event-name. EventSource ignores
    // unknown event types unless explicitly addEventListener'd, so
    // adding new variants in the api requires updating this list.
    const NAMES: AdminEventName[] = [
      'alert.fired', 'alert.updated', 'probe.recorded',
      'anchor.break', 'heartbeat', 'hello',
    ];
    for (const name of NAMES) {
      es.addEventListener(name, (ev: MessageEvent) => dispatch(name, ev.data));
    }

    return () => {
      stopped = true;
      try { es.close(); } catch { /* noop */ }
      esRef.current = null;
      setConnected(false);
    };
  }, [url]);

  const value: AdminEventStreamContext = { connected, url: url ?? '', subscribe };

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

/**
 * Subscribe one handler to one event type. Returns the parent context's
 * `connected` flag for badge rendering. Safe to call from any descendant
 * of {@link AdminEventStreamProvider}; outside the provider it's a no-op
 * (returns connected=false, subscribe = noop).
 */
export function useAdminEvents<T = unknown>(
  name: AdminEventName,
  handler: AdminEventHandler<T>,
): { connected: boolean } {
  const value = useContext(ctx);
  // Latch the latest handler in a ref so callers don't need to memoize —
  // the subscribe callback only fires on mount/unmount. Assignment goes
  // inside an effect so we don't mutate refs during render (eslint
  // react-hooks/refs).
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    if (!value) return;
    return value.subscribe(name, ((p: unknown) => handlerRef.current(p as T)) as AdminEventHandler);
  }, [name, value]);

  return { connected: value?.connected ?? false };
}

/** Read-only access to the connection state — for header badges that don't need a handler. */
export function useAdminEventsConnected(): boolean {
  return useContext(ctx)?.connected ?? false;
}
