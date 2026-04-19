import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AIRPORTS,
  airportCity,
  airportCoords,
  airportCountry,
} from '@/lib/data/airports';
import {
  getAirportCity,
  getAirportCoords,
  getAirportCountry,
  getAirportRecord,
} from '@/lib/data/airportIndex';

/**
 * The airports dataset is lazy-loaded at runtime from `/data/airports.json`.
 * In tests we hydrate the in-memory cache directly from the file on disk so
 * the sync lookup helpers have data to work with.
 */
beforeAll(() => {
  const json = fs.readFileSync(path.resolve('public/data/airports.json'), 'utf8');
  const data = JSON.parse(json) as typeof AIRPORTS;
  for (const [iata, record] of Object.entries(data)) {
    AIRPORTS[iata] = record;
  }
});

describe('airports (lazy-loaded)', () => {
  it('looks up airports case-insensitively via the direct helpers', () => {
    expect(airportCity('fra')).toBe('Frankfurt');
    expect(airportCountry('FRA')).toBe('DE');
    expect(airportCoords('FRA')).toEqual({ lat: expect.any(Number), lon: expect.any(Number) });
  });

  it('returns empty / null for unknown airports', () => {
    expect(airportCity('ZZ1')).toBe('');
    expect(airportCountry('ZZ1')).toBe('');
    expect(airportCoords('ZZ1')).toBeNull();
  });
});

describe('airportIndex helpers', () => {
  it('looks up airports case-insensitively', () => {
    expect(getAirportCity('fra')).toBe('Frankfurt');
    expect(getAirportCountry('FRA')).toBe('DE');
  });

  it('returns null for unknown airports', () => {
    expect(getAirportRecord('ZZ1')).toBeNull();
    expect(getAirportCoords('ZZ1')).toBeNull();
  });
});
