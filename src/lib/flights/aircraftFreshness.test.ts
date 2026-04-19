import { describe, expect, it } from 'vitest';
import {
  CACHED_TTL_MS,
  FRESH_THRESHOLD_MS,
  ageSeconds,
  isCached,
  isExpired,
  isFresh,
  mergeAircraftMaps,
} from '@/lib/flights/aircraftFreshness';
import type { AircraftState } from '@/lib/types';

function ac(icao: string, lastUpdateMs: number): AircraftState {
  return { icao24: icao, category: 4, onGround: false, lastUpdate: lastUpdateMs };
}

const NOW = 1_700_000_000_000;

describe('aircraftFreshness', () => {
  it('classifies a just-seen aircraft as fresh', () => {
    const a = ac('a', NOW - 30_000);
    expect(isFresh(a, NOW)).toBe(true);
    expect(isCached(a, NOW)).toBe(false);
    expect(isExpired(a, NOW)).toBe(false);
  });

  it('classifies a silent-but-recent aircraft as cached (not fresh)', () => {
    const a = ac('a', NOW - FRESH_THRESHOLD_MS - 1_000);
    expect(isFresh(a, NOW)).toBe(false);
    expect(isCached(a, NOW)).toBe(true);
    expect(isExpired(a, NOW)).toBe(false);
  });

  it('classifies an aircraft beyond the TTL as expired', () => {
    const a = ac('a', NOW - CACHED_TTL_MS - 1_000);
    expect(isExpired(a, NOW)).toBe(true);
    expect(isCached(a, NOW)).toBe(false);
  });

  it('ageSeconds rounds to whole seconds', () => {
    expect(ageSeconds(ac('a', NOW - 120_500), NOW)).toBe(121);
  });
});

describe('mergeAircraftMaps', () => {
  it('keeps previous aircraft that are silent-but-recent', () => {
    const prev = new Map([['old', ac('old', NOW - 5 * 60_000)]]);
    const fresh = new Map([['new', ac('new', NOW)]]);
    const out = mergeAircraftMaps(prev, fresh, NOW);
    expect(out.has('old')).toBe(true);
    expect(out.has('new')).toBe(true);
  });

  it('drops previous aircraft that are beyond the TTL', () => {
    const prev = new Map([['stale', ac('stale', NOW - CACHED_TTL_MS - 1_000)]]);
    const fresh = new Map([['new', ac('new', NOW)]]);
    const out = mergeAircraftMaps(prev, fresh, NOW);
    expect(out.has('stale')).toBe(false);
    expect(out.has('new')).toBe(true);
  });

  it('replaces a previous entry when the aircraft reappears in the fresh batch', () => {
    const prev = new Map([['a', ac('a', NOW - 5 * 60_000)]]);
    const fresh = new Map([['a', ac('a', NOW)]]);
    const out = mergeAircraftMaps(prev, fresh, NOW);
    expect(out.get('a')!.lastUpdate).toBe(NOW);
  });
});
