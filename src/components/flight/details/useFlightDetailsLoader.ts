'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFlightDetails } from '@/components/flight/details/fetchFlightDetails';
import type { AircraftMetadata, AircraftState, FlightRouteInfo } from '@/lib/types';

export type RefreshStatus = 'idle' | 'success' | 'error';

interface DetailsSnapshot {
  metadata: AircraftMetadata | null;
  photoUrl: string | null;
  routeInfo: FlightRouteInfo | null;
  selectionKey: string | null;
}

const EMPTY: DetailsSnapshot = { metadata: null, photoUrl: null, routeInfo: null, selectionKey: null };

const SUCCESS_MS = 2500;
const ERROR_MS = 4000;

/** Build the request-cache key for a given aircraft. */
function keyOf(aircraft: AircraftState | null): string | null {
  if (!aircraft) return null;
  return `${aircraft.icao24}:${aircraft.callsign?.trim() ?? ''}`;
}

/** Encapsulates details fetch + refresh logic. Tiny orchestration; helpers do the work. */
export function useFlightDetailsLoader(selectedAircraft: AircraftState | null) {
  const [details, setDetails] = useState<DetailsSnapshot>(EMPTY);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle');
  const requestIdRef = useRef(0);

  const selectionKey = keyOf(selectedAircraft);

  const flashStatus = useCallback((status: RefreshStatus) => {
    setRefreshStatus(status);
    const ms = status === 'error' ? ERROR_MS : SUCCESS_MS;
    setTimeout(() => setRefreshStatus('idle'), ms);
  }, []);

  const loadOnce = useCallback(async (aircraft: AircraftState, key: string, signal: AbortSignal, reqId: number) => {
    try {
      const next = await fetchFlightDetails(aircraft.icao24, aircraft.callsign, signal);
      if (signal.aborted || reqId !== requestIdRef.current) return;
      setDetails({ selectionKey: key, ...next });
      flashStatus('success');
    } catch {
      if (signal.aborted || reqId !== requestIdRef.current) return;
      setDetails({ selectionKey: key, routeInfo: null, metadata: null, photoUrl: null });
      flashStatus('error');
    }
  }, [flashStatus]);

  useEffect(() => {
    if (!selectedAircraft || !selectionKey) return;
    const controller = new AbortController();
    const reqId = ++requestIdRef.current;
    // Defer the status reset onto a microtask so the setState fires
    // outside the synchronous effect body (avoids React 19's
    // `react-hooks/set-state-in-effect` cascading-render warning).
    // The guard ensures a switch-during-flight doesn't flip status
    // back to 'idle' after a newer selection already settled.
    queueMicrotask(() => {
      if (!controller.signal.aborted && reqId === requestIdRef.current) {
        setRefreshStatus('idle');
      }
    });
    void loadOnce(selectedAircraft, selectionKey, controller.signal, reqId);
    return () => controller.abort();
  }, [selectedAircraft, selectionKey, loadOnce]);

  const handleRefresh = useCallback(async () => {
    if (!selectedAircraft || !selectionKey || isRefreshing) return;
    const controller = new AbortController();
    const reqId = ++requestIdRef.current;
    setIsRefreshing(true);
    setRefreshStatus('idle');
    try {
      await loadOnce(selectedAircraft, selectionKey, controller.signal, reqId);
    } finally {
      if (!controller.signal.aborted && reqId === requestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, selectedAircraft, selectionKey, loadOnce]);

  const active = details.selectionKey === selectionKey ? details : EMPTY;
  const isLoading = Boolean(selectedAircraft && details.selectionKey !== selectionKey);

  return {
    details: { metadata: active.metadata, photoUrl: active.photoUrl, routeInfo: active.routeInfo },
    isLoading,
    isRefreshing,
    refreshStatus,
    handleRefresh,
  };
}
