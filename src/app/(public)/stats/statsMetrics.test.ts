import { describe, expect, it } from 'vitest';
import {
  activitySummary,
  countUniqueAirlines,
  countUniqueAirports,
  recentFlights,
  topAirlines,
  topAirports,
  topRoutes,
  viewsByDay,
  viewsByHour,
} from '@/app/(public)/stats/statsMetrics';
import type { FlightStatEntry } from '@/lib/stores/statsStore';

/**
 * Build a deterministic FlightStatEntry with sensible defaults so each
 * test only writes the fields it actually cares about. Timestamps are
 * passed through `at()` to keep the math obvious in test bodies.
 */
const make = (overrides: Partial<FlightStatEntry> & { icao24: string }): FlightStatEntry => ({
  icao24: overrides.icao24,
  callsign: overrides.callsign,
  airlineIcao: overrides.airlineIcao,
  firstSeenAt: overrides.firstSeenAt ?? Date.parse('2026-01-01T12:00:00Z'),
  lastSeenAt: overrides.lastSeenAt ?? Date.parse('2026-01-01T12:00:00Z'),
  viewCount: overrides.viewCount ?? 1,
  depIata: overrides.depIata,
  arrIata: overrides.arrIata,
});

describe('countUniqueAirlines', () => {
  it('returns 0 for an empty list', () => {
    expect(countUniqueAirlines([])).toBe(0);
  });

  it('counts distinct airline ICAOs and ignores undefined', () => {
    const flights = [
      make({ icao24: 'a', airlineIcao: 'DLH' }),
      make({ icao24: 'b', airlineIcao: 'DLH' }),
      make({ icao24: 'c', airlineIcao: 'THY' }),
      make({ icao24: 'd' }),
    ];
    expect(countUniqueAirlines(flights)).toBe(2);
  });
});

describe('countUniqueAirports', () => {
  it('returns 0 for an empty list', () => {
    expect(countUniqueAirports([])).toBe(0);
  });

  it('counts both departure and arrival sides', () => {
    const flights = [
      make({ icao24: 'a', depIata: 'FRA', arrIata: 'IST' }),
      make({ icao24: 'b', depIata: 'IST', arrIata: 'TUN' }),
      make({ icao24: 'c' }),
    ];
    // FRA, IST, TUN → 3 unique
    expect(countUniqueAirports(flights)).toBe(3);
  });
});

describe('topAirlines', () => {
  it('sorts by total viewCount descending', () => {
    const flights = [
      make({ icao24: 'a', airlineIcao: 'DLH', viewCount: 5 }),
      make({ icao24: 'b', airlineIcao: 'DLH', viewCount: 2 }),
      make({ icao24: 'c', airlineIcao: 'THY', viewCount: 10 }),
      make({ icao24: 'd', airlineIcao: 'AFR', viewCount: 1 }),
    ];
    expect(topAirlines(flights)).toEqual([
      ['THY', 10],
      ['DLH', 7],
      ['AFR', 1],
    ]);
  });

  it('skips entries without airlineIcao', () => {
    const flights = [
      make({ icao24: 'a' }),
      make({ icao24: 'b', airlineIcao: 'DLH', viewCount: 3 }),
    ];
    expect(topAirlines(flights)).toEqual([['DLH', 3]]);
  });

  it('caps at 5 entries', () => {
    const flights = Array.from({ length: 10 }, (_, i) =>
      make({ icao24: `ac${i}`, airlineIcao: `AL${i}`, viewCount: i + 1 }),
    );
    expect(topAirlines(flights)).toHaveLength(5);
  });
});

describe('topRoutes', () => {
  it('returns nothing when no flights have both endpoints', () => {
    const flights = [
      make({ icao24: 'a', depIata: 'FRA' }),
      make({ icao24: 'b', arrIata: 'IST' }),
    ];
    expect(topRoutes(flights)).toEqual([]);
  });

  it('aggregates viewCount per (dep, arr) pair', () => {
    const flights = [
      make({ icao24: 'a', depIata: 'FRA', arrIata: 'IST', viewCount: 3 }),
      make({ icao24: 'b', depIata: 'FRA', arrIata: 'IST', viewCount: 2 }),
      make({ icao24: 'c', depIata: 'IST', arrIata: 'FRA', viewCount: 1 }),
    ];
    const result = topRoutes(flights);
    expect(result[0]).toMatchObject({ dep: 'FRA', arr: 'IST', views: 5 });
    expect(result[1]).toMatchObject({ dep: 'IST', arr: 'FRA', views: 1 });
  });

  it('treats reverse direction as a separate route', () => {
    const flights = [
      make({ icao24: 'a', depIata: 'FRA', arrIata: 'IST', viewCount: 1 }),
      make({ icao24: 'b', depIata: 'IST', arrIata: 'FRA', viewCount: 1 }),
    ];
    expect(topRoutes(flights)).toHaveLength(2);
  });
});

describe('topAirports', () => {
  it('counts each side toward the airport tally', () => {
    const flights = [
      make({ icao24: 'a', depIata: 'FRA', arrIata: 'IST', viewCount: 2 }),
      make({ icao24: 'b', depIata: 'IST', arrIata: 'TUN', viewCount: 3 }),
    ];
    // FRA: 2, IST: 5, TUN: 3
    const result = topAirports(flights);
    expect(result[0]).toEqual(['IST', 5]);
    expect(result.find(([code]) => code === 'FRA')?.[1]).toBe(2);
    expect(result.find(([code]) => code === 'TUN')?.[1]).toBe(3);
  });
});

describe('recentFlights', () => {
  it('returns flights sorted by lastSeenAt descending', () => {
    const flights = [
      make({ icao24: 'old',    lastSeenAt: 100 }),
      make({ icao24: 'newest', lastSeenAt: 300 }),
      make({ icao24: 'mid',    lastSeenAt: 200 }),
    ];
    expect(recentFlights(flights).map((f) => f.icao24)).toEqual(['newest', 'mid', 'old']);
  });

  it('caps at 20 entries', () => {
    const flights = Array.from({ length: 30 }, (_, i) =>
      make({ icao24: `f${i}`, lastSeenAt: i }),
    );
    expect(recentFlights(flights)).toHaveLength(20);
  });

  it('does not mutate input', () => {
    const flights = [
      make({ icao24: 'a', lastSeenAt: 1 }),
      make({ icao24: 'b', lastSeenAt: 2 }),
    ];
    const before = flights.map((f) => f.icao24);
    recentFlights(flights);
    expect(flights.map((f) => f.icao24)).toEqual(before);
  });
});

describe('viewsByHour', () => {
  it('returns 24 zeros for an empty list', () => {
    const buckets = viewsByHour([]);
    expect(buckets).toHaveLength(24);
    expect(buckets.every((v) => v === 0)).toBe(true);
  });

  it('buckets viewCount by the hour-of-day of lastSeenAt', () => {
    // Use a fixed local time so the assertion does not depend on TZ.
    const noon  = new Date(2026, 0, 1, 12, 30, 0).getTime();
    const dawn  = new Date(2026, 0, 1,  6,  0, 0).getTime();
    const flights = [
      make({ icao24: 'a', lastSeenAt: noon, viewCount: 2 }),
      make({ icao24: 'b', lastSeenAt: noon, viewCount: 3 }),
      make({ icao24: 'c', lastSeenAt: dawn, viewCount: 1 }),
    ];
    const buckets = viewsByHour(flights);
    expect(buckets[12]).toBe(5);
    expect(buckets[6]).toBe(1);
    // total preserved
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(6);
  });
});

describe('activitySummary', () => {
  it('returns a neutral summary when empty', () => {
    expect(activitySummary([])).toEqual({
      trackingSince: null,
      daysActive: 0,
      peakDay: null,
      peakDayViews: 0,
    });
  });

  it('anchors trackingSince to the earliest firstSeenAt', () => {
    const flights = [
      make({ icao24: 'a', firstSeenAt: 500, lastSeenAt: 600 }),
      make({ icao24: 'b', firstSeenAt: 100, lastSeenAt: 200 }),
      make({ icao24: 'c', firstSeenAt: 800, lastSeenAt: 900 }),
    ];
    expect(activitySummary(flights).trackingSince).toBe(100);
  });

  it('counts distinct days and picks the peak day', () => {
    const dayA = new Date(2026, 0, 1, 10).getTime();
    const dayB = new Date(2026, 0, 2, 11).getTime();
    const dayB2 = new Date(2026, 0, 2, 18).getTime();
    const flights = [
      make({ icao24: 'a', firstSeenAt: dayA, lastSeenAt: dayA, viewCount: 1 }),
      make({ icao24: 'b', firstSeenAt: dayB, lastSeenAt: dayB, viewCount: 4 }),
      make({ icao24: 'c', firstSeenAt: dayB2, lastSeenAt: dayB2, viewCount: 2 }),
    ];
    const summary = activitySummary(flights);
    expect(summary.daysActive).toBe(2);
    expect(summary.peakDay).toBe('2026-01-02');
    expect(summary.peakDayViews).toBe(6);
  });
});

describe('viewsByDay', () => {
  // Anchor: 2026-05-20 at 12:00 local time (matches the system's
  // currentDate context — keeps the relative day math obvious).
  const NOW = new Date(2026, 4, 20, 12, 0, 0).getTime();

  it('returns an array of the requested length', () => {
    expect(viewsByDay([], 7, NOW)).toHaveLength(7);
    expect(viewsByDay([], 30, NOW)).toHaveLength(30);
  });

  it('returns zeros for an empty list', () => {
    expect(viewsByDay([], 5, NOW)).toEqual([0, 0, 0, 0, 0]);
  });

  it('places flights into the bucket matching their lastSeenAt day, oldest first', () => {
    // 5-day window ending today. Oldest bucket index 0 = today-4.
    const today = new Date(2026, 4, 20, 9).getTime();
    const yesterday = new Date(2026, 4, 19, 9).getTime();
    const fourDaysAgo = new Date(2026, 4, 16, 9).getTime();

    const flights = [
      make({ icao24: 'a', lastSeenAt: today, viewCount: 3 }),
      make({ icao24: 'b', lastSeenAt: yesterday, viewCount: 2 }),
      make({ icao24: 'c', lastSeenAt: fourDaysAgo, viewCount: 5 }),
    ];

    const buckets = viewsByDay(flights, 5, NOW);
    expect(buckets).toEqual([5, 0, 0, 2, 3]);
  });

  it('drops flights older than the window', () => {
    const farPast = new Date(2026, 0, 1).getTime();
    const flights = [make({ icao24: 'old', lastSeenAt: farPast, viewCount: 99 })];
    expect(viewsByDay(flights, 5, NOW)).toEqual([0, 0, 0, 0, 0]);
  });

  it('aggregates multiple flights on the same day by viewCount', () => {
    const today = new Date(2026, 4, 20, 10).getTime();
    const flights = [
      make({ icao24: 'a', lastSeenAt: today, viewCount: 4 }),
      make({ icao24: 'b', lastSeenAt: today, viewCount: 3 }),
    ];
    const buckets = viewsByDay(flights, 3, NOW);
    expect(buckets[buckets.length - 1]).toBe(7);
  });
});
