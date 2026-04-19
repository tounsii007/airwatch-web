import { describe, expect, it } from 'vitest';
import { buildTripData } from '@/components/replay3d/buildTripData';
import type { FlightPosition } from '@/lib/schemas';

function pos(overrides: Partial<FlightPosition>): FlightPosition {
  return {
    id: 0, icao24: 'abc', callsign: 'LH001',
    latitude: 50, longitude: 10, altitude: 10_000,
    speed: 200, heading: 90, verticalSpeed: 0,
    squawk: null, timestamp: '2026-04-19T10:00:00Z',
    ...overrides,
  };
}

describe('buildTripData', () => {
  it('returns null for empty or single-point input', () => {
    expect(buildTripData([])).toBeNull();
    expect(buildTripData([pos({})])).toBeNull();
  });

  it('sorts points by timestamp even if the source is shuffled', () => {
    const trip = buildTripData([
      pos({ timestamp: '2026-04-19T10:02:00Z', id: 2 }),
      pos({ timestamp: '2026-04-19T10:00:00Z', id: 0 }),
      pos({ timestamp: '2026-04-19T10:01:00Z', id: 1 }),
    ]);
    expect(trip).not.toBeNull();
    expect(trip!.points.map((p) => p.tMs)).toEqual([0, 60_000, 120_000]);
    expect(trip!.durationMs).toBe(120_000);
  });

  it('stores positions in deck.gl [lon, lat, alt] order', () => {
    const trip = buildTripData([
      pos({ latitude: 50, longitude: 10, altitude: 5000 }),
      pos({ latitude: 51, longitude: 11, altitude: 6000, timestamp: '2026-04-19T10:01:00Z' }),
    ])!;
    expect(trip.points[0].position).toEqual([10, 50, 5000]);
    expect(trip.points[1].position).toEqual([11, 51, 6000]);
  });
});
