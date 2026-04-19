import { describe, expect, it } from 'vitest';
import { simplifyDouglasPeucker } from '@/components/replay3d/simplifyPath';
import type { TripPoint } from '@/components/replay3d/types';

function pt(lon: number, lat: number, t = 0): TripPoint {
  return { position: [lon, lat, 0], tMs: t, headingDeg: 0, speedMs: 0, verticalSpeedMs: 0 };
}

describe('simplifyDouglasPeucker', () => {
  it('keeps both endpoints for a perfectly straight line', () => {
    const pts = [pt(0, 0), pt(1, 0), pt(2, 0), pt(3, 0), pt(4, 0)];
    const out = simplifyDouglasPeucker(pts, 0.01);
    expect(out).toHaveLength(2);
    expect(out[0].position).toEqual([0, 0, 0]);
    expect(out[1].position).toEqual([4, 0, 0]);
  });

  it('keeps every point when tolerance is tighter than the deviation', () => {
    const pts = [pt(0, 0), pt(1, 0.5), pt(2, 0), pt(3, -0.5), pt(4, 0)];
    const out = simplifyDouglasPeucker(pts, 0.001);
    expect(out.length).toBeGreaterThanOrEqual(4);
  });

  it('passes input with fewer than 3 points through unchanged', () => {
    expect(simplifyDouglasPeucker([], 0.5)).toEqual([]);
    const one = [pt(0, 0)];
    expect(simplifyDouglasPeucker(one, 0.5)).toEqual(one);
  });
});
