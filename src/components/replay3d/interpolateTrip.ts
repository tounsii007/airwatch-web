import type { TripData, TripPoint } from '@/components/replay3d/types';

export interface TripSnapshot {
  position: [number, number, number];
  headingDeg: number;
  speedMs: number;
  verticalSpeedMs: number;
  nextIndex: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shortest-arc interpolation of heading (degrees) so 350° → 10° doesn't spin 340°. */
function lerpHeading(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return ((a + diff * t) + 360) % 360;
}

function binarySearch(points: readonly TripPoint[], t: number): number {
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].tMs < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Linearly interpolate the trip state at `tMs` (trip-local time). */
export function interpolateAt(trip: TripData, tMs: number): TripSnapshot {
  const pts = trip.points;
  if (pts.length === 0) return snapshotOf(pts[0] ?? fallback(), 0);
  if (tMs <= pts[0].tMs) return snapshotOf(pts[0], 0);
  const last = pts[pts.length - 1];
  if (tMs >= last.tMs) return snapshotOf(last, pts.length - 1);

  const i = binarySearch(pts, tMs);
  const a = pts[i - 1];
  const b = pts[i];
  const span = b.tMs - a.tMs;
  const ratio = span === 0 ? 0 : (tMs - a.tMs) / span;

  return {
    position: [
      lerp(a.position[0], b.position[0], ratio),
      lerp(a.position[1], b.position[1], ratio),
      lerp(a.position[2], b.position[2], ratio),
    ],
    headingDeg: lerpHeading(a.headingDeg, b.headingDeg, ratio),
    speedMs: lerp(a.speedMs, b.speedMs, ratio),
    verticalSpeedMs: lerp(a.verticalSpeedMs, b.verticalSpeedMs, ratio),
    nextIndex: i,
  };
}

function snapshotOf(p: TripPoint, index: number): TripSnapshot {
  return {
    position: p.position,
    headingDeg: p.headingDeg,
    speedMs: p.speedMs,
    verticalSpeedMs: p.verticalSpeedMs,
    nextIndex: index,
  };
}

function fallback(): TripPoint {
  return { position: [0, 0, 0], tMs: 0, headingDeg: 0, speedMs: 0, verticalSpeedMs: 0 };
}
