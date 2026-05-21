import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AIRPORTS } from '@/lib/data/airports';
import { buildCountryResults } from './buildCountryResults';
import type { AircraftState } from '@/lib/types';

beforeAll(() => {
  const json = fs.readFileSync(path.resolve('public/data/airports.json'), 'utf8');
  const data = JSON.parse(json) as typeof AIRPORTS;
  for (const [iata, record] of Object.entries(data)) {
    AIRPORTS[iata] = record;
  }
});

function makeAc(over: Partial<AircraftState>): AircraftState {
  return {
    icao24: 'ABCDEF',
    onGround: false,
    category: 0,
    lastUpdate: Date.now(),
    ...over,
  };
}

describe('buildCountryResults — cross-locale country pivot', () => {
  const empty = new Map<string, AircraftState>();

  it('returns no country when the query matches no alias', () => {
    const r = buildCountryResults(empty, 'qqqqq');
    expect(r.country).toBeNull();
    expect(r.airlines).toEqual([]);
    expect(r.airports).toEqual([]);
    expect(r.flights).toEqual([]);
  });

  it('resolves "Tunesien" (DE) into the Tunisia pivot', () => {
    const r = buildCountryResults(empty, 'Tunesien');
    expect(r.country?.canonical).toBe('Tunisia');
    expect(r.country?.code).toBe('tn');
    expect(r.airlines.map((a) => a.icao)).toContain('TAR');     // Tunisair
    expect(r.airlines.map((a) => a.icao)).toContain('LBT');     // Nouvelair
    expect(r.airports.map((a) => a.iata)).toContain('TUN');
  });

  it('resolves "tunisie" (FR) into the Tunisia pivot', () => {
    const r = buildCountryResults(empty, 'tunisie');
    expect(r.country?.canonical).toBe('Tunisia');
    expect(r.airlines.length).toBeGreaterThan(0);
  });

  it('resolves "تونس" (AR) into the Tunisia pivot', () => {
    const r = buildCountryResults(empty, 'تونس');
    expect(r.country?.canonical).toBe('Tunisia');
  });

  it('resolves "Tunezja" (PL) and "Tunesië" (NL) into Tunisia', () => {
    expect(buildCountryResults(empty, 'Tunezja').country?.canonical).toBe('Tunisia');
    expect(buildCountryResults(empty, 'Tunesië').country?.canonical).toBe('Tunisia');
  });

  it('resolves "Almanya" (TR) into Germany with German airlines', () => {
    const r = buildCountryResults(empty, 'Almanya');
    expect(r.country?.canonical).toBe('Germany');
    expect(r.airlines.map((a) => a.icao)).toContain('DLH');
    expect(r.airports.map((a) => a.iata)).toContain('FRA');
  });

  it('counts live flights connected to the country', () => {
    const live = new Map<string, AircraftState>([
      ['1', makeAc({ icao24: '1', depIata: 'TUN', arrIata: 'CDG', callsign: 'AFR1' })],
      ['2', makeAc({ icao24: '2', depIata: 'CDG', arrIata: 'JFK', callsign: 'AFR2' })],
      ['3', makeAc({ icao24: '3', depIata: 'FRA', arrIata: 'TUN', callsign: 'DLH3' })],
      ['4', makeAc({ icao24: '4', callsign: 'TAR4' })],
    ]);
    const r = buildCountryResults(live, 'Tunesien');
    expect(r.country?.flightCount).toBe(3);
    // flight #2 has no Tunisian touchpoint.
    expect(r.flights.find((f) => f.aircraft.icao24 === '2')).toBeUndefined();
  });

  it('returns the same pivot across nine locales', () => {
    const aliases = [
      'Tunisia',     // EN
      'Tunesien',    // DE
      'Tunisie',     // FR
      'Túnez',       // ES
      'Tunisia',     // IT (matches EN form)
      'تونس',        // AR
      'Tunezja',     // PL
      'Tunesië',     // NL
      'Tunus',       // TR
    ];
    const canonicals = aliases.map((q) => buildCountryResults(empty, q).country?.canonical);
    for (const c of canonicals) expect(c).toBe('Tunisia');
    // All return the same airline set, regardless of input locale.
    const sets = aliases.map((q) => buildCountryResults(empty, q).airlines.map((a) => a.icao).sort().join(','));
    expect(new Set(sets).size).toBe(1);
  });
});
