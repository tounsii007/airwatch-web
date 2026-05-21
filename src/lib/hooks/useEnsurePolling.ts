'use client';

/**
 * Idempotent "kick the flight feed if it's idle" hook. Every page that
 * displays live flight data was inlining the same one-liner:
 *
 *   useEffect(() => { if (aircraftMap.size === 0) startPolling(); },
 *            [aircraftMap.size, startPolling]);
 *
 * One source of truth keeps the dependency array honest and lets future
 * additions (telemetry, ws preference, error-state guard) land in a
 * single place rather than seven.
 *
 * The store internally already debounces re-starts, so calling this on
 * every page mount is safe — it's a no-op when the feed is healthy.
 */
import { useEffect } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';

export function useEnsurePolling(): void {
  const aircraftMapSize = useFlightStore((s) => s.aircraftMap.size);
  const startPolling = useFlightStore((s) => s.startPolling);

  useEffect(() => {
    if (aircraftMapSize === 0) startPolling();
  }, [aircraftMapSize, startPolling]);
}
