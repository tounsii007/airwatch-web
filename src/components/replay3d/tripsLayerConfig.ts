import { TripsLayer } from '@deck.gl/geo-layers';
import type { TripData } from '@/components/replay3d/types';

interface Params {
  trip: TripData;
  /** ms since trip start — same scale as TripPoint.tMs. */
  currentTimeMs: number;
  /** Optional pulse to re-render when the data reference is stable. */
  generation?: number;
}

/** Tail length the GPU blends toward the head. 30 s gives a visible wake. */
const TRAIL_LENGTH_MS = 30_000;

/**
 * Animated trail: runs entirely on the GPU — the current time is a uniform,
 * so we can drive 60 fps without touching the JS heap per frame.
 */
export function buildTripsLayer({ trip, currentTimeMs, generation = 0 }: Params) {
  return new TripsLayer<TripData>({
    id: `replay-trips-${trip.icao24}-${generation}`,
    data: [trip],
    getPath: (d) => d.points.map((p) => p.position),
    getTimestamps: (d) => d.points.map((p) => p.tMs),
    getColor: [122, 154, 191], // var(--primary)
    opacity: 0.9,
    widthMinPixels: 3,
    rounded: true,
    trailLength: TRAIL_LENGTH_MS,
    currentTime: currentTimeMs,
    jointRounded: true,
    capRounded: true,
  });
}
