import { describe, expect, it } from 'vitest';
import { interpolateAt } from '@/components/replay3d/interpolateTrip';
import type { TripData, TripPoint } from '@/components/replay3d/types';

function pt(tMs: number, lon: number, lat: number, alt: number, heading = 0): TripPoint {
  return { position: [lon, lat, alt], tMs, headingDeg: heading, speedMs: 100, verticalSpeedMs: 0 };
}

function trip(points: TripPoint[]): TripData {
  return {
    icao24: 'abc', callsign: null, points,
    startEpochMs: 0, durationMs: points.at(-1)?.tMs ?? 0,
  };
}

describe('interpolateAt', () => {
  it('clamps to the start for negative times', () => {
    const t = trip([pt(0, 10, 50, 5000), pt(10_000, 11, 51, 6000)]);
    const snap = interpolateAt(t, -100);
    expect(snap.position).toEqual([10, 50, 5000]);
  });

  it('clamps to the last point for times past the end', () => {
    const t = trip([pt(0, 10, 50, 5000), pt(10_000, 11, 51, 6000)]);
    const snap = interpolateAt(t, 999_999);
    expect(snap.position).toEqual([11, 51, 6000]);
  });

  it('linearly interpolates between two points', () => {
    const t = trip([pt(0, 10, 50, 5000), pt(10_000, 11, 51, 6000)]);
    const snap = interpolateAt(t, 5000);
    expect(snap.position[0]).toBeCloseTo(10.5);
    expect(snap.position[1]).toBeCloseTo(50.5);
    expect(snap.position[2]).toBeCloseTo(5500);
  });

  it('takes the short way around the heading wrap (350° → 10°)', () => {
    const t = trip([pt(0, 0, 0, 0, 350), pt(1000, 0, 0, 0, 10)]);
    const snap = interpolateAt(t, 500);
    // midway between 350 and 10 is 0 (or 360), not 180
    expect([0, 360]).toContain(Math.round(snap.headingDeg));
  });
});
