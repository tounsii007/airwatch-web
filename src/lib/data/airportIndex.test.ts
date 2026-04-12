import { describe, expect, it } from 'vitest';
import { getAirportCity, getAirportCoords, getAirportCountry, getAirportRecord } from './airportIndex';

describe('airport index', () => {
  it('looks up airports case-insensitively', () => {
    expect(getAirportCity('fra')).toBe('Frankfurt');
    expect(getAirportCountry('FRA')).toBe('DE');
  });

  it('returns null for unknown airports', () => {
    expect(getAirportRecord('ZZ1')).toBeNull();
    expect(getAirportCoords('ZZ1')).toBeNull();
  });
});
