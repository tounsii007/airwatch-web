'use client';

import { useMemo } from 'react';
import type { FlightPosition } from '@/lib/schemas';
import { buildTripData } from '@/components/replay3d/buildTripData';
import { DEFAULT_SIMPLIFY_TOLERANCE_DEG, simplifyDouglasPeucker } from '@/components/replay3d/simplifyPath';
import type { TripData } from '@/components/replay3d/types';

/** Max points we keep after simplification — guards against 50k-point tracks. */
const MAX_POINTS = 5_000;

function cap(points: TripData['points']): TripData['points'] {
  if (points.length <= MAX_POINTS) return points;
  const step = Math.ceil(points.length / MAX_POINTS);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

/** Memoized trip build + simplification. Only re-runs when positions change. */
export function useTripData(positions: readonly FlightPosition[]): TripData | null {
  return useMemo(() => {
    const raw = buildTripData(positions);
    if (!raw) return null;
    const simplified = simplifyDouglasPeucker(raw.points, DEFAULT_SIMPLIFY_TOLERANCE_DEG);
    return { ...raw, points: cap(simplified) };
  }, [positions]);
}
