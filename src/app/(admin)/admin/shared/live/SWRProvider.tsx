'use client';

/**
 * SWR provider for the admin shell.
 *
 * <h3>Why SWR</h3>
 * The admin dashboard mounts ~12 live widgets per page, each polling
 * its own endpoint. A previous home-grown hook (useLiveData) gave us
 * per-widget polling but no de-duplication, no retry-with-backoff,
 * and no shared cache. That meant:
 *   * 10 widgets calling `/admin/api/csrf` → 10 round-trips per render.
 *   * A 500 from the api triggered a hard re-render with no retry —
 *     operators saw a flash of "fetch failed" then nothing happened
 *     until the next 30 s tick.
 *   * No way to invalidate by predicate ("re-pull every alert-related
 *     widget after a mutation"), only the global "refresh everything"
 *     hammer.
 *
 * SWR fixes all three with one config block. The home-grown hook is
 * preserved as a thin wrapper ({@link useLiveData}) so the call sites
 * don't change — they keep their `intervalMs` / `pauseWhenHidden` /
 * `initialData` / `lastUpdatedMs` semantics, just backed by SWR's cache
 * + dedup + retry machinery underneath.
 *
 * <h3>Defaults</h3>
 *   * `dedupingInterval: 2000` — multiple widgets requesting the same
 *     URL within 2 s share one network call. Picked at 2 s rather than
 *     SWR's default (also 2 s) to make this explicit; raising it would
 *     mask a slow widget, lowering would defeat the point.
 *   * `revalidateOnFocus: false` — the admin already has an explicit
 *     refresh button + auto-refresh dropdown + global broadcast.
 *     Re-pulling on every tab-focus would double-fire on a 1-second
 *     polling interval.
 *   * `revalidateOnReconnect: true` — the cluster's nginx admin port
 *     can wink in and out during deploys; on network recovery we want
 *     a fresh snapshot.
 *   * `errorRetryCount: 3` with `errorRetryInterval: 1000` — SWR
 *     applies exponential backoff on top of the base interval (so
 *     retries are at ~1 s, ~2 s, ~4 s). Beyond that the widget shows
 *     its error state; the next manual refresh or auto-tick clears it.
 *   * `shouldRetryOnError`: skip 4xx (auth / validation — retrying
 *     won't change the answer) but DO retry 5xx + 408 + 429 (transient
 *     server / overload).
 */

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

/**
 * Default fetcher used when a `useSWR(url)` consumer doesn't override.
 * Mirrors the original useLiveData fetch: cookies, no-store, JSON.
 *
 * Throws an Error with a `status` field on non-2xx so the
 * shouldRetryOnError predicate can branch on it.
 */
async function fetcher(url: string): Promise<unknown> {
  const res = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status: number; info?: unknown };
    err.status = res.status;
    try { err.info = await res.json(); } catch { /* body wasn't JSON, fine */ }
    throw err;
  }
  return res.json();
}

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        dedupingInterval: 2000,
        focusThrottleInterval: 5000,
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        keepPreviousData: true,
        shouldRetryOnError: (err: Error & { status?: number }) => {
          const status = err?.status;
          // No status → network error (DNS, offline, CORS) → retry.
          if (status == null) return true;
          // 401/403 → auth issue, retrying won't fix; let the session
          // heartbeat surface the redirect to /admin/login.
          if (status === 401 || status === 403) return false;
          // 404 → endpoint genuinely missing, retrying just spams logs.
          if (status === 404) return false;
          // 5xx + 408 (request timeout) + 429 (rate-limit) → transient.
          return status >= 500 || status === 408 || status === 429;
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
