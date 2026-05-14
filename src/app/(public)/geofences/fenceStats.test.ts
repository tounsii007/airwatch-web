// @vitest-environment node
/**
 * Pure aggregator — runs in node, no DOM needed.
 */
import { describe, expect, it } from 'vitest';
import { computeFenceStats } from '@/app/(public)/geofences/fenceStats';
import type { GeoFenceAlert } from '@/lib/stores/geofenceStore';

function alert(over: Partial<GeoFenceAlert>): GeoFenceAlert {
  return {
    fenceId: 1,
    fenceName: 'F',
    icao24: 'aaa111',
    callsign: 'DLH441',
    airlineIcao: 'DLH',
    latitude: 0,
    longitude: 0,
    altitude: 10000,
    speed: 0,
    timestamp: '2026-05-14T10:00:00Z',
    ...over,
  };
}

describe('computeFenceStats()', () => {
  it('returns the empty struct when the fence has no alerts', () => {
    const s = computeFenceStats([], 1);
    expect(s).toEqual({
      total: 0,
      topAirline: null,
      uniqueAircraft: 0,
      latestAt: null,
      avgAltitudeMeters: null,
    });
  });

  it('counts only alerts matching the fenceId', () => {
    const s = computeFenceStats(
      [alert({ fenceId: 1, icao24: 'a' }), alert({ fenceId: 2, icao24: 'b' })],
      1,
    );
    expect(s.total).toBe(1);
  });

  it('counts unique aircraft, deduplicating by icao24', () => {
    const s = computeFenceStats(
      [
        alert({ icao24: 'aaa111' }),
        alert({ icao24: 'aaa111' }),    // duplicate
        alert({ icao24: 'bbb222' }),
      ],
      1,
    );
    expect(s.uniqueAircraft).toBe(2);
    expect(s.total).toBe(3);
  });

  it('picks the most frequent airline and resolves its name', () => {
    const s = computeFenceStats(
      [
        alert({ airlineIcao: 'DLH', icao24: 'a' }),
        alert({ airlineIcao: 'DLH', icao24: 'b' }),
        alert({ airlineIcao: 'RYR', icao24: 'c' }),
      ],
      1,
    );
    expect(s.topAirline?.code).toBe('DLH');
    expect(s.topAirline?.count).toBe(2);
    expect(s.topAirline?.name).toMatch(/Lufthansa/i);
  });

  it('falls back to the first 3 chars of the callsign when airlineIcao is empty', () => {
    const s = computeFenceStats(
      [
        alert({ airlineIcao: null, callsign: 'AAL123', icao24: 'a' }),
        alert({ airlineIcao: null, callsign: 'AAL999', icao24: 'b' }),
      ],
      1,
    );
    expect(s.topAirline?.code).toBe('AAL');
  });

  it('skips airline counting when neither airlineIcao nor callsign is usable', () => {
    const s = computeFenceStats(
      [alert({ airlineIcao: null, callsign: null, icao24: 'a' })],
      1,
    );
    expect(s.topAirline).toBeNull();
    expect(s.total).toBe(1);
  });

  it('returns the newest timestamp as latestAt', () => {
    const s = computeFenceStats(
      [
        alert({ timestamp: '2026-05-14T09:00:00Z' }),
        alert({ timestamp: '2026-05-14T10:00:00Z' }),
        alert({ timestamp: '2026-05-14T09:30:00Z' }),
      ],
      1,
    );
    expect(s.latestAt).toBe('2026-05-14T10:00:00Z');
  });

  it('averages the altitude across all matching alerts (rounded to integer metres)', () => {
    const s = computeFenceStats(
      [alert({ altitude: 1000 }), alert({ altitude: 2000 }), alert({ altitude: 3000 })],
      1,
    );
    expect(s.avgAltitudeMeters).toBe(2000);
  });

  it('respects a fenceId that does not match any alert (returns EMPTY)', () => {
    const s = computeFenceStats([alert({ fenceId: 1 })], 999);
    expect(s.total).toBe(0);
    expect(s.topAirline).toBeNull();
  });
});
