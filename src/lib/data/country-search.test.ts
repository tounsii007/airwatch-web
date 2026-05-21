import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AIRPORTS } from '@/lib/data/airports';
import {
  airlinesByCountry,
  airportsByCountry,
  flightTouchesCountry,
} from '@/lib/data/country-search';
import type { AircraftState } from '@/lib/types';

/**
 * Country-search depends on the AIRPORTS index (ISO-2 country codes per IATA
 * entry). Hydrate it from disk so the synchronous filters have data to work
 * with — same pattern as the airportIndex tests.
 */
beforeAll(() => {
  const json = fs.readFileSync(path.resolve('public/data/airports.json'), 'utf8');
  const data = JSON.parse(json) as typeof AIRPORTS;
  for (const [iata, record] of Object.entries(data)) {
    AIRPORTS[iata] = record;
  }
});

describe('airlinesByCountry', () => {
  it('returns every Tunisian airline from the catalogue', () => {
    const list = airlinesByCountry('Tunisia');
    const names = list.map((a) => a.name).sort();
    expect(names).toContain('Tunisair');
    expect(names).toContain('Nouvelair');
  });

  it('returns every German airline', () => {
    const list = airlinesByCountry('Germany');
    const names = list.map((a) => a.name);
    expect(names).toContain('Lufthansa');
    expect(names).toContain('Eurowings');
    expect(names).toContain('Condor');
  });

  it('treats "USA" and "United States" as the same country (ISO bridge)', () => {
    const a = airlinesByCountry('USA').map((x) => x.icao).sort();
    const b = airlinesByCountry('United States').map((x) => x.icao).sort();
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(5);
  });

  it('returns [] for unknown countries without throwing', () => {
    expect(airlinesByCountry('Wakanda')).toEqual([]);
    expect(airlinesByCountry('')).toEqual([]);
  });

  it('sorts results alphabetically by name', () => {
    const list = airlinesByCountry('Germany');
    const names = list.map((a) => a.name);
    const sorted = [...names].sort((x, y) => x.localeCompare(y));
    expect(names).toEqual(sorted);
  });
});

describe('airportsByCountry', () => {
  it('returns Tunisian airports keyed by IATA', () => {
    const list = airportsByCountry('Tunisia');
    const codes = list.map((a) => a.iata);
    // TUN is Tunis-Carthage — guaranteed to be in the bundled snapshot.
    expect(codes).toContain('TUN');
    expect(list.length).toBeGreaterThan(0);
    // Every result carries an IATA of length 3 (not the ICAO duplicates).
    for (const a of list) expect(a.iata).toMatch(/^[A-Z0-9]{3}$/);
  });

  it('caps the result list at the requested limit', () => {
    const big = airportsByCountry('USA', 10);
    expect(big.length).toBeLessThanOrEqual(10);
  });

  it('returns [] for unknown countries', () => {
    expect(airportsByCountry('Wakanda')).toEqual([]);
    expect(airportsByCountry('')).toEqual([]);
  });

  it('dedupes airports that the index records under both IATA and ICAO keys', () => {
    const list = airportsByCountry('Germany', 200);
    const codes = list.map((a) => a.iata);
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size);
  });

  it('treats "United States" the same as "USA" via the ISO bridge', () => {
    const usa = airportsByCountry('USA', 5).map((a) => a.iata);
    const united = airportsByCountry('United States', 5).map((a) => a.iata);
    expect(usa).toEqual(united);
  });
});

describe('flightTouchesCountry', () => {
  const homeFor = (icao: string): string | undefined => {
    if (icao === 'TAR') return 'Tunisia';
    if (icao === 'DLH') return 'Germany';
    return undefined;
  };

  function makeAc(overrides: Partial<AircraftState>): AircraftState {
    return {
      icao24: '0d0d24',
      onGround: false,
      category: 0,
      lastUpdate: Date.now(),
      ...overrides,
    };
  }

  it('matches a flight whose departure airport is in the country', () => {
    const ac = makeAc({ depIata: 'TUN', arrIata: 'CDG', callsign: 'AFR123' });
    expect(flightTouchesCountry(ac, 'Tunisia', homeFor)).toBe(true);
  });

  it('matches a flight whose arrival airport is in the country', () => {
    const ac = makeAc({ depIata: 'CDG', arrIata: 'TUN', callsign: 'AFR123' });
    expect(flightTouchesCountry(ac, 'Tunisia', homeFor)).toBe(true);
  });

  it('matches a flight whose airline is registered in the country', () => {
    // No route data — Airlabs hydration hasn't filled depIata / arrIata yet.
    const ac = makeAc({ callsign: 'TAR456' });
    expect(flightTouchesCountry(ac, 'Tunisia', homeFor)).toBe(true);
  });

  it('rejects flights that touch unrelated countries', () => {
    const ac = makeAc({ depIata: 'JFK', arrIata: 'LAX', callsign: 'DLH123' });
    expect(flightTouchesCountry(ac, 'Tunisia', homeFor)).toBe(false);
  });

  it('handles missing route data gracefully', () => {
    const ac = makeAc({ callsign: undefined });
    expect(flightTouchesCountry(ac, 'Tunisia', homeFor)).toBe(false);
  });
});
