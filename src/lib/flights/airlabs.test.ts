import { describe, expect, it } from 'vitest';
import { buildAircraftMap, guessCategory, kmhToMs, parseAirlabsFlight } from '@/lib/flights/airlabs';

describe('airlabs helpers', () => {
  it('maps a flight payload into aircraft state', () => {
    const aircraft = parseAirlabsFlight({
      aircraft_icao: 'A388',
      airline_icao: 'DLH',
      alt: 10000,
      arr_iata: 'JFK',
      dep_iata: 'FRA',
      dir: 90,
      flight_icao: 'DLH400',
      flag: 'DE',
      hex: 'abc123',
      lat: 50.1,
      lng: 8.6,
      speed: 720,
      status: 'en-route',
      updated: 123,
      v_speed: 18,
    });

    expect(aircraft.icao24).toBe('abc123');
    expect(aircraft.category).toBe(6);
    expect(aircraft.velocity).toBeCloseTo(200);
    expect(aircraft.verticalRate).toBeCloseTo(5);
    expect(aircraft.depIata).toBe('FRA');
    expect(aircraft.arrIata).toBe('JFK');
  });

  it('builds a map and ignores entries without valid coordinates', () => {
    const aircraftMap = buildAircraftMap([
      { hex: 'a1', lat: 1, lng: 2 },
      { hex: 'a2', lat: 1 },
    ]);

    expect(aircraftMap.size).toBe(1);
    expect(aircraftMap.has('a1')).toBe(true);
    expect(aircraftMap.has('a2')).toBe(false);
  });

  it('categorizes representative ICAO types', () => {
    expect(guessCategory('A388')).toBe(6);
    expect(guessCategory('AT76')).toBe(3);
    expect(guessCategory('C172')).toBe(2);
    expect(guessCategory('EC35')).toBe(8);
    expect(guessCategory('A320')).toBe(4);
  });

  it('converts kmh to m/s', () => {
    expect(kmhToMs(360)).toBeCloseTo(100);
    expect(kmhToMs(undefined)).toBeUndefined();
  });
});
