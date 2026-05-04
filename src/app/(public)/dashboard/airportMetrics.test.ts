import { describe, expect, it } from 'vitest';
import { computeMetrics } from '@/app/(public)/dashboard/airportMetrics';
import type { AirportScheduleFlight } from '@/lib/types';

function flight(overrides: Partial<AirportScheduleFlight> = {}): AirportScheduleFlight {
  return {
    flightIcao: 'TEST',
    flightIata: 'XX1',
    airlineIata: 'XX',
    depIata: 'AAA',
    arrIata: 'BBB',
    ...overrides,
  };
}

describe('computeMetrics', () => {
  it('returns zeros when both lists empty', () => {
    const m = computeMetrics([], []);
    expect(m.total).toBe(0);
    expect(m.onTimePercent).toBe(0);
    expect(m.busiestHour).toBeNull();
    expect(m.hourBuckets).toHaveLength(24);
    expect(m.hourBuckets.every((c) => c === 0)).toBe(true);
  });

  it('counts on-time when delay ≤ 15 min', () => {
    const m = computeMetrics(
      [flight({ depDelayed: 0 }), flight({ depDelayed: 10 }), flight({ depDelayed: 15 })],
      [],
    );
    expect(m.onTime).toBe(3);
    expect(m.delayed).toBe(0);
    expect(m.onTimePercent).toBe(100);
  });

  it('counts delayed when delay > 15 min', () => {
    const m = computeMetrics(
      [flight({ depDelayed: 0 }), flight({ depDelayed: 30 }), flight({ depDelayed: 60 })],
      [],
    );
    expect(m.onTime).toBe(1);
    expect(m.delayed).toBe(2);
    expect(m.onTimePercent).toBe(33);
    expect(m.avgDelayMin).toBe(45);
  });

  it('treats missing delay as on-time', () => {
    const m = computeMetrics(
      [flight({ depDelayed: undefined })],
      [],
    );
    expect(m.onTime).toBe(1);
  });

  it('finds the busiest hour from depTime / arrTime', () => {
    // 14:30 has 3 flights, 09:00 has 1, 17:00 has 2 → busiest = 14
    const m = computeMetrics(
      [
        flight({ depTime: '2026-04-30T14:30:00Z' }),
        flight({ depTime: '2026-04-30T14:45:00Z' }),
        flight({ depTime: '2026-04-30T09:00:00Z' }),
      ],
      [
        flight({ arrTime: '2026-04-30T17:15:00Z' }),
        flight({ arrTime: '2026-04-30T17:50:00Z' }),
        flight({ arrTime: '2026-04-30T14:10:00Z' }),
      ],
    );
    expect(m.busiestHour).toBe(14);
    expect(m.hourBuckets[14]).toBe(3);
  });

  it('returns null busiestHour when no times parse', () => {
    const m = computeMetrics([flight({ depTime: 'not-a-date' })], []);
    expect(m.busiestHour).toBeNull();
  });

  it('combines departures + arrivals into a single total', () => {
    const m = computeMetrics([flight()], [flight(), flight()]);
    expect(m.total).toBe(3);
  });
});
