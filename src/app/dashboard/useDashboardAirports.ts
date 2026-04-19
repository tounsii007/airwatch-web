'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '@/lib/stores/dashboardStore';
import { createLoadingAirport, fetchDashboardAirport, type DashboardAirport } from '@/app/dashboard/dashboardData';

type Loaded = Record<string, DashboardAirport>;

async function fetchAll(codes: readonly string[]): Promise<Loaded> {
  const results = await Promise.all(codes.map(fetchDashboardAirport));
  const next: Loaded = {};
  for (const airport of results) next[airport.iata] = airport;
  return next;
}

/** Central state for the dashboard page — codes, merged loaded data, add/remove. */
export function useDashboardAirports() {
  const airportCodes = useDashboardStore((s) => s.airportCodes);
  const addAirportCode = useDashboardStore((s) => s.addAirportCode);
  const removeAirportCode = useDashboardStore((s) => s.removeAirportCode);
  const [loadedAirports, setLoadedAirports] = useState<Loaded>({});

  const airports = useMemo(
    () => airportCodes.map((code) => loadedAirports[code] ?? createLoadingAirport(code)),
    [airportCodes, loadedAirports],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fresh = await fetchAll(airportCodes);
      if (!cancelled) setLoadedAirports((prev) => ({ ...prev, ...fresh }));
    })();
    return () => { cancelled = true; };
  }, [airportCodes]);

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

  return { airports, addAirport, removeAirport };
}
