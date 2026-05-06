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
 * <h3>Backed by SWR</h3>
 * The hook is a thin facade over `useSWR`. The external API is
 * preserved (intervalMs / pauseWhenHidden / skipInitialFetch /
 * initialData / lastUpdatedMs / refresh) so all existing call sites
 * keep working unchanged. Underneath we now get:
 *
 *   * **Request de-duplication**: 10 widgets fetching the same URL
 *     within `dedupingInterval` (2 s, see SWRProvider) share a single
 *     in-flight request and a single response. Pre-SWR, `useLiveData`
 *     fired one request per mount.
 *   * **Exponential backoff** on transient errors: SWR retries at
 *     ~1 s / ~2 s / ~4 s (capped by `errorRetryCount`) instead of the
 *     pre-SWR "no retry, wait for next tick" behaviour. 4xx auth/404
 *     are skipped — see SWRProvider's `shouldRetryOnError`.
 *   * **Cross-widget invalidation**: the legacy CustomEvent broadcast
 *     is preserved AND piggy-backed on `mutate(() => true)` so SWR
 *     consumers that don't go through `useLiveData` are also notified
 *     by `dispatchGlobalRefresh()`.
 *   * **Optimistic mutations**: callers can patch their cache before
 *     the writer round-trips. See {@link LiveDataResult.mutate}.
 *
 * <h3>Global broadcast</h3>
 * Window-level CustomEvent {@link REFRESH_EVENT}. Anything can dispatch
 * it (the global "Refresh" button, the AutoRefresh tick, a successful
 * mutation that should fan out to readers). Every mounted hook listens
 * via SWR's revalidation. We also dispatch the legacy CustomEvent so
 * any non-SWR observer (e.g. a future widget that wants to flash a UI
 * cue on global refresh) can still subscribe.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR, { mutate as globalMutate, type KeyedMutator } from 'swr';

/** CustomEvent name. Listen with window.addEventListener. */
export const REFRESH_EVENT = 'admin:refresh-all';

/**
 * Broadcast a refresh to every mounted useLiveData hook.
 *
 * Two channels in one call:
 *   1. SWR `mutate(() => true)` — re-validates every cache entry, no
 *      matter what hook owns it.
 *   2. The legacy `REFRESH_EVENT` CustomEvent for any non-SWR listener.
 */
export function dispatchGlobalRefresh() {
  if (typeof window === 'undefined') return;
  // SWR's `mutate(() => true, undefined, { revalidate: true })` matches
  // every cache entry and triggers a re-fetch. The empty data argument
  // means "don't touch the cached value, just re-pull".
  void globalMutate(() => true, undefined, { revalidate: true });
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
  /**
   * Optimistic mutation helper.
   *
   * Patches the SWR cache to `optimisticData` immediately, runs
   * `writer()` (typically a POST/PATCH/DELETE round-trip), then
   * re-validates the URL. On error the cache rolls back automatically.
   *
   * Use this from a row-level Ack / Snooze button so the badge flips
   * the instant the operator clicks, without waiting on the 30 s
   * polling tick. The pre-SWR `useLiveData` had no equivalent —
   * mutations had to manually call `refresh()` after the writer
   * resolved, which left a 100-300 ms "stale" window where the row
   * still showed the old state.
   */
  mutate: <R>(
    writer: () => Promise<R>,
    opts?: { optimisticData?: T; rollbackOnError?: boolean },
  ) => Promise<R | undefined>;
}

/**
 * Subscribe to one URL with refresh semantics.
 *
 * @param url        endpoint to fetch (relative or absolute). Pass null
 *                   to skip — useful for "fetch only if X is set" cases.
 * @param options    polling cadence + lifecycle hints
 */
export function useLiveData<T = unknown>(
  url: string | null,
  options: LiveDataOptions = {},
): LiveDataResult<T> {
  const {
    intervalMs       = 0,
    pauseWhenHidden  = true,
    skipInitialFetch = false,
    initialData      = null,
  } = options;

  // SWR treats null as "skip this request". We map that through.
  const swrKey: string | null = url;

  // We only set fallbackData when the caller actually provided
  // initialData. Passing `undefined` lets SWR distinguish "no value"
  // from "explicit null/empty".
  const hasInitial = initialData != null;

  const swr = useSWR<T>(swrKey, {
    refreshInterval: intervalMs > 0 ? intervalMs : 0,
    // SWR's flag is the inverse: `refreshWhenHidden: true` means keep
    // ticking while hidden. `pauseWhenHidden: true` (our option) maps
    // to `refreshWhenHidden: false`.
    refreshWhenHidden: !pauseWhenHidden,
    refreshWhenOffline: false,
    fallbackData: hasInitial ? (initialData as T) : undefined,
    // skipInitialFetch only matters when fallbackData is present; when
    // there's no fallback we always need the initial fetch to populate
    // the cache.
    revalidateOnMount: !(skipInitialFetch && hasInitial),
  });

  // Track the timestamp of the last successful fetch. SWR doesn't
  // expose this directly, so we observe data + error + isValidating
  // transitions: the moment isValidating flips false WITHOUT an error,
  // we know a fetch just succeeded. We seed the value from initialData
  // so the "Updated Xs ago" label doesn't show "—" for the first
  // render of a SSR-hydrated widget.
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(
    hasInitial ? Date.now() : null,
  );
  const wasValidatingRef = useRef<boolean>(false);
  useEffect(() => {
    const isValidating = swr.isValidating;
    // edge: isValidating just flipped from true → false
    if (wasValidatingRef.current && !isValidating) {
      if (!swr.error && swr.data !== undefined) {
        setLastUpdatedMs(Date.now());
      }
    }
    wasValidatingRef.current = isValidating;
  }, [swr.isValidating, swr.error, swr.data]);

  // The legacy CustomEvent broadcast still fans out — any non-SWR
  // listener can act on it. SWR consumers don't need this listener
  // (dispatchGlobalRefresh already triggers SWR's matcher mutate),
  // but we keep it for forward-compat with widgets that may want to
  // react to a "refresh-all" cue without going through SWR.
  const swrMutate: KeyedMutator<T> = swr.mutate;
  useEffect(() => {
    function handler() { void swrMutate(); }
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [swrMutate]);

  return {
    data: (swr.data ?? null) as T | null,
    // Match the pre-SWR semantics: loading is true on every fetch
    // (not just the first). This drives the "spin the refresh icon"
    // affordance in LiveWidgetHeader.
    loading: swr.isValidating,
    error: swr.error ? (swr.error as Error).message : null,
    lastUpdatedMs,
    refresh: async () => { await swrMutate(); },
    mutate: async <R,>(
      writer: () => Promise<R>,
      opts?: { optimisticData?: T; rollbackOnError?: boolean },
    ): Promise<R | undefined> => {
      const optimisticData = opts?.optimisticData;
      const rollbackOnError = opts?.rollbackOnError !== false;
      let writerResult: R | undefined;
      try {
        await swrMutate(
          async () => {
            writerResult = await writer();
            // Returning undefined tells SWR "I don't have the new
            // server value, please re-pull". We avoid threading the
            // mutation response into the cache directly because the
            // shape of admin endpoints varies (some return the row,
            // some return {ok:true}, some 204).
            return undefined;
          },
          {
            optimisticData,
            rollbackOnError,
            populateCache: false,
            revalidate: true,
          },
        );
        return writerResult;
      } catch (e) {
        if (rollbackOnError) return undefined;
        throw e;
      }
    },
  };
}
