import type { TripPoint } from '@/components/replay3d/types';

/**
 * Perpendicular distance from a 2D point to the segment (start, end) in
 * lon/lat space. Good enough for on-screen filtering; we don't need geodesic
 * precision because the tolerance is already a visual heuristic.
 */
function perpDistance(p: TripPoint, start: TripPoint, end: TripPoint): number {
  const [x, y] = p.position;
  const [x1, y1] = start.position;
  const [x2, y2] = end.position;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  const tClamped = Math.max(0, Math.min(1, t));
  const projX = x1 + tClamped * dx;
  const projY = y1 + tClamped * dy;
  return Math.hypot(x - projX, y - projY);
}

/**
 * Iterative Douglas-Peucker simplification. Iterative (not recursive) to
 * avoid stack blow-ups on long tracks. Keeps the endpoints.
 */
export function simplifyDouglasPeucker(points: readonly TripPoint[], toleranceDeg: number): TripPoint[] {
  if (points.length < 3) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpDistance(points[i], points[first], points[last]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > toleranceDeg && idx !== -1) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }

  const out: TripPoint[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/** Picks a reasonable tolerance for GPU-heavy rendering. ~5m at equator. */
export const DEFAULT_SIMPLIFY_TOLERANCE_DEG = 0.00005;
