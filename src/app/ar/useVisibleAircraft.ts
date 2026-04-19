'use client';

import { useMemo } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { collectVisibleAircraft, type ArAircraft } from '@/app/ar/visibleAircraft';
import type { DeviceOrientation, Viewport } from '@/app/ar/arProjection';

interface Params {
  lat: number | null;
  lon: number | null;
  heading: number | null;
  pitch: number | null;
  viewport: Viewport | null;
}

const EMPTY: ArAircraft[] = [];

/** Re-project the live aircraft map on every sensor tick. */
export function useVisibleAircraft({ lat, lon, heading, pitch, viewport }: Params): ArAircraft[] {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);

  return useMemo(() => {
    if (lat == null || lon == null || heading == null || pitch == null || viewport == null) return EMPTY;
    const orientation: DeviceOrientation = { heading, pitch };
    return collectVisibleAircraft({ aircraftMap, observer: { lat, lon }, orientation, viewport });
  }, [aircraftMap, lat, lon, heading, pitch, viewport]);
}
