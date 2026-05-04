'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardStore } from '@/lib/stores/dashboardStore';
import {
  createLoadingAirport,
  fetchDashboardAirport,
  type DashboardAirport,
} from '@/app/(public)/dashboard/dashboardData';

type Loaded = Record<string, DashboardAirport>;

const AUTO_REFRESH_MS = 60_000; // refresh once a minute while the tab is visible

async function fetchAll(codes: readonly string[]): Promise<Loaded> {
  const results = await Promise.all(codes.map(fetchDashboardAirport));
  const next: Loaded = {};
  for (const airport of results) next[airport.iata] = airport;
  return next;
}

/** Central state for the dashboard page — codes, merged loaded data,
 *  add/remove, manual + auto refresh, last-updated timestamp. */
export function useDashboardAirports() {
  const airportCodes = useDashboardStore((s) => s.airportCodes);
  const addAirportCode = useDashboardStore((s) => s.addAirportCode);
  const removeAirportCode = useDashboardStore((s) => s.removeAirportCode);
  const [loadedAirports, setLoadedAirports] = useState<Loaded>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  // requestId guards against out-of-order completions when multiple
  // refresh kicks happen close together (e.g. the user clicks refresh
  // mid-auto-poll). Only the latest in-flight request is allowed to
  // commit.
  const requestIdRef = useRef(0);

  const airports = useMemo(
    () => airportCodes.map((code) => loadedAirports[code] ?? createLoadingAirport(code)),
    [airportCodes, loadedAirports],
  );

  const refresh = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setIsRefreshing(true);
    try {
      const fresh = await fetchAll(airportCodes);
      if (reqId !== requestIdRef.current) return;
      setLoadedAirports((prev) => ({ ...prev, ...fresh }));
      setLastUpdated(Date.now());
    } finally {
      if (reqId === requestIdRef.current) setIsRefreshing(false);
    }
  }, [airportCodes]);

  // Initial load + refetch when the airport list changes. Deferred
  // onto a microtask so React doesn't see a synchronous setState in
  // the effect body (the refresh callback flips isRefreshing before
  // its first await).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void refresh(); });
    return () => { cancelled = true; };
  }, [refresh]);

  // Auto-refresh every AUTO_REFRESH_MS but only while the document is
  // visible — pausing when the tab is backgrounded saves the API
  // (cheap for us) AND the user's battery (less cheap on mobile).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => { void refresh(); }, AUTO_REFRESH_MS);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    if (document.visibilityState === 'visible') start();
    const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [refresh]);

  const addAirport = useCallback((raw: string) => {
    const iata = raw.trim().toUpperCase();
    if (!iata || iata.length !== 3) return false;
    if (airportCodes.includes(iata)) return false;
    addAirportCode(iata);
    return true;
  }, [airportCodes, addAirportCode]);

  const removeAirport = useCallback((iata: string) => {
    removeAirportCode(iata);
    setLoadedAirports((prev) => {
      const next = { ...prev };
      delete next[iata.toUpperCase()];
      return next;
    });
  }, [removeAirportCode]);

  return {
    airports,
    addAirport,
    removeAirport,
    refresh,
    isRefreshing,
    lastUpdated,
  };
}
