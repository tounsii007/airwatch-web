import { describe, expect, it } from 'vitest';
import { favoriteId } from './favoriteId';

describe('favoriteId', () => {
  it('builds an airline key with upper-case ICAO', () => {
    expect(favoriteId.airline('dlh')).toBe('airline-DLH');
    expect(favoriteId.airline('DLH')).toBe('airline-DLH');
  });

  it('builds an airport key with upper-case IATA', () => {
    expect(favoriteId.airport('fra')).toBe('airport-FRA');
    expect(favoriteId.airport('FRA')).toBe('airport-FRA');
  });

  it('uses raw lower-case ICAO24 for flight keys — matches localStorage history', () => {
    // ICAO24 is globally unique 6-char hex, no collision risk against
    // airline/airport 3-letter codes, so we keep the existing un-prefixed
    // shape to avoid breaking persisted user data.
    expect(favoriteId.flight('A1B2C3')).toBe('a1b2c3');
    expect(favoriteId.flight('a1b2c3')).toBe('a1b2c3');
  });

  it('does not mix prefix namespaces — airline/airport with the same code stay distinct', () => {
    // FRA exists as an IATA airport AND (hypothetically) as a 3-letter
    // ICAO code. The prefix guarantees no collision in the store.
    expect(favoriteId.airline('FRA')).not.toBe(favoriteId.airport('FRA'));
  });
});
