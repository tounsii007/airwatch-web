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

  it('builds a flight key with lower-case ICAO24 (matches OpenSky convention)', () => {
    expect(favoriteId.flight('A1B2C3')).toBe('flight-a1b2c3');
    expect(favoriteId.flight('a1b2c3')).toBe('flight-a1b2c3');
  });

  it('does not mix prefix namespaces — airline/airport with the same code stay distinct', () => {
    // FRA exists as an IATA airport AND (hypothetically) as a 3-letter
    // ICAO code. The prefix guarantees no collision in the store.
    expect(favoriteId.airline('FRA')).not.toBe(favoriteId.airport('FRA'));
  });
});
