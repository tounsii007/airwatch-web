/**
 * Per-widget live-data hook with global refresh broadcast.
 *
 * <h3>What it does</h3>
 * Subscribes a chart / table / KPI block to a single API endpoint. Each
 * widget owns its own data, its own loading state, and its own refresh
 * button. A global refresh broadcast (fired by the header's "Refresh
 * all" or by an AutoRefresh tick) tells every mounted widget to re-pull
 * — so the operator sees one consistent snapshot across the page,
 * without needing to round-trip through Next.js's server-component
 * re-render cycle.
 *
 * <h3>Why per-widget instead of one big router.refresh()</h3>
 * router.refresh() re-runs every server fetch on the page. On a
 * dashboard with 12 widgets that's 12 sequential network calls bound
 * to the slowest one. With per-widget polling each call is independent
 * + parallel + can be paused individually (e.g. when the tab is
 * backgrounded, when an operator is editing a form). It also lets
 * heavy widgets opt out of fast intervals.
 *
 * <h3>Global broadcast</h3>
 * Window-level CustomEvent {@link REFRESH_EVENT}. Anything can dispatch
 * it (the global "Refresh" button, the AutoRefresh tick, a successful
 * mutation that should fan out to readers). Every mounted hook listens
 * and re-fetches.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** CustomEvent name. Listen with window.addEventListener. */
export const REFRESH_EVENT = 'admin:refresh-all';

/** Broadcast a refresh to every mounted useLiveData hook. */
export function dispatchGlobalRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

export interface LiveDataOptions {
  /** Auto-refresh interval in ms. 0 = disabled (only manual + global). */
  intervalMs?: number;
  /** Pause the auto-tick when the tab is backgrounded. Default true. */
  pauseWhenHidden?: boolean;
  /** Skip the first auto-refresh — useful if the parent already
   *  hydrated `initialData` and we don't want a duplicate fetch. */
  skipInitialFetch?: boolean;
  /** Initial value before the first fetch lands. */
  initialData?: unknown;
}

export interface LiveDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Epoch ms of the most-recent successful fetch, or null. */
  lastUpdatedMs: number | null;
  /** Manually trigger a re-fetch. Returns the promise so callers can await. */
  refresh: () => Promise<void>;
}

/**
 * Subscribe to one URL with refresh semantics.
 *
 * @param url        endpoint to fetch (relative or absolute)
 * @param options    polling cadence + lifecycle hints
 */
export function useLiveData<T = unknown>(url: string, options: LiveDataOptions = {}): LiveDataResult<T> {
  const {
    intervalMs        = 0,
    pauseWhenHidden   = true,
    skipInitialFetch  = false,
    initialData       = null,
  } = options;

  const [data, setData]         = useState<T | null>(initialData as T | null);
  const [loading, setLoading]   = useState(!skipInitialFetch);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(initialData ? Date.now() : null);

  // AbortController for the in-flight request — cancelled on unmount or
  // on the next refresh, so a slow first request never overwrites a
  // newer second response (last-write-wins-by-time race).
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(url, { credentials: 'include', cache: 'no-store', signal: ac.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as T;
      if (ac.signal.aborted) return;
      setData(body);
      setError(null);
      setLastUpdatedMs(Date.now());
    } catch (ex) {
      if (ac.signal.aborted) return;
      setError(ex instanceof Error ? ex.message : 'fetch failed');
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [url]);

  // Initial fetch (unless suppressed).
  useEffect(() => {
    if (!skipInitialFetch) void refresh();
    return () => abortRef.current?.abort();
    // intentionally omit refresh from deps — it's stable per url
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Auto-refresh interval (paused on hidden tab if requested).
  useEffect(() => {
    if (intervalMs <= 0) return;
    let id: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (id != null) return;
      id = setInterval(() => { void refresh(); }, intervalMs);
    }
    function stop() {
      if (id == null) return;
      clearInterval(id);
      id = null;
    }
    function onVisibility() {
      if (!pauseWhenHidden) return;
      if (document.hidden) stop();
      else start();
    }
    if (!pauseWhenHidden || !document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [intervalMs, pauseWhenHidden, refresh]);

  // Subscribe to the global refresh broadcast.
  useEffect(() => {
    function handler() { void refresh(); }
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [refresh]);

  return { data, loading, error, lastUpdatedMs, refresh };
}
