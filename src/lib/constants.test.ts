import { describe, expect, it } from 'vitest';
import { API } from './constants';

/**
 * The {@link API} helpers are pure URL builders, but the wire-format
 * details (uppercase flag, encoded comma in bbox) matter — the backend
 * proxy validates each parameter with a strict regex, and a typo here
 * silently produces an HTTP 400 with no UI error message.
 */
describe('API.flightsByBbox', () => {
  it('builds the proxy URL with the bbox value verbatim', () => {
    expect(API.flightsByBbox('46.01,-10.89,56.84,8.34'))
      .toBe('/api/proxy/airlabs/flights?bbox=46.01%2C-10.89%2C56.84%2C8.34');
  });

  it('encodes the bbox commas — guards against router segment confusion', () => {
    // %2C is the URL-encoded comma. Without encoding, some routers split
    // on bare commas and corrupt the query string.
    const url = API.flightsByBbox('1,2,3,4');
    expect(url).toContain('%2C');
    expect(url).not.toContain('bbox=1,2,3,4');
  });

  it('appends an _fields selector when provided', () => {
    expect(API.flightsByBbox('1,2,3,4', 'hex,lat,lng'))
      .toContain('&_fields=hex,lat,lng');
  });
});

describe('API.flightsByFlag', () => {
  it('uppercases the flag before sending — Airlabs is case-sensitive', () => {
    // Backend also uppercases as defence-in-depth, but doing it client-side
    // means the request URL is stable regardless of caller convention.
    expect(API.flightsByFlag('fr')).toBe('/api/proxy/airlabs/flights?flag=FR');
    expect(API.flightsByFlag('FR')).toBe('/api/proxy/airlabs/flights?flag=FR');
  });

  it('combines flag + _fields without breaking the query separator', () => {
    const url = API.flightsByFlag('de', 'hex,reg_number');
    expect(url).toBe('/api/proxy/airlabs/flights?flag=DE&_fields=hex,reg_number');
  });
});

// ─── Iter 11: catalogue + lookup endpoints ───

describe('API.airportsNearby', () => {
  it('rounds lat/lng to 4 decimals for cache-key stability', () => {
    // Browser geolocation jitters in the 5th-decimal range. Truncating to
    // 4 decimals (≈ 11 m precision) means a stationary user reuses the
    // same cache entry across geolocation refreshes.
    expect(API.airportsNearby(48.5012345, 9.0067891))
      .toBe('/api/proxy/airlabs/airports/nearby?lat=48.5012&lng=9.0068&distance=100');
  });

  it('honours a custom distance override', () => {
    expect(API.airportsNearby(40.0, -74.0, 250))
      .toBe('/api/proxy/airlabs/airports/nearby?lat=40.0000&lng=-74.0000&distance=250');
  });
});

describe('API.airlines', () => {
  it('returns the bare endpoint when no filters are supplied', () => {
    expect(API.airlines()).toBe('/api/proxy/airlabs/airlines');
  });

  it('uppercases every filter and uses URLSearchParams for ordering', () => {
    expect(API.airlines({ country: 'de', iata: 'lh', icao: 'dlh' }))
      .toBe('/api/proxy/airlabs/airlines?country_code=DE&iata_code=LH&icao_code=DLH');
  });
});

describe('API.cities / API.countries', () => {
  it('emit bare endpoints when filterless', () => {
    expect(API.cities()).toBe('/api/proxy/airlabs/cities');
    expect(API.countries()).toBe('/api/proxy/airlabs/countries');
  });

  it('uppercase the country filter', () => {
    expect(API.cities('de')).toBe('/api/proxy/airlabs/cities?country_code=DE');
    expect(API.countries('us')).toBe('/api/proxy/airlabs/countries?country_code=US');
  });
});

describe('API.aircraft', () => {
  it('prefers reg_number when both supplied', () => {
    // Mirrors the backend convention — explicit identity beats opaque hash.
    expect(API.aircraft({ reg: 'd-aiqf', hex: '3c6743' }))
      .toBe('/api/proxy/airlabs/aircraft?reg_number=D-AIQF');
  });

  it('falls back to hex when reg is absent', () => {
    expect(API.aircraft({ hex: '3c6743' }))
      .toBe('/api/proxy/airlabs/aircraft?hex=3C6743');
  });
});

describe('API.fleets / API.wiki', () => {
  it('build canonical URLs', () => {
    expect(API.fleets('lh')).toBe('/api/proxy/airlabs/fleets?airline_iata=LH');
    expect(API.wiki({ airlineIata: 'lh' }))
      .toBe('/api/proxy/airlabs/wiki?airline_iata=LH');
    expect(API.wiki({ airportIata: 'fra' }))
      .toBe('/api/proxy/airlabs/wiki?airport_iata=FRA');
  });
});

describe('API.suggest / API.locations', () => {
  it('URL-encode the query — required for spaces and accents', () => {
    // "Frankfurt am Main" has spaces; without encoding the space breaks
    // the query string. Saint-Étienne has an accented char that must
    // round-trip cleanly.
    expect(API.suggest('Frankfurt am Main'))
      .toBe('/api/proxy/airlabs/suggest?q=Frankfurt%20am%20Main');
    expect(API.locations('Saint-Étienne'))
      .toContain('Saint-%C3%89tienne');
  });
});

describe('API.delays', () => {
  it('builds the type=departures shape with no filters', () => {
    expect(API.delays('departures')).toBe('/api/proxy/airlabs/delays?type=departures');
  });

  it('layers airport + airline filters in URLSearchParams order', () => {
    expect(API.delays('arrivals', { depIata: 'fra', arrIata: 'muc', airlineIata: 'lh' }))
      .toBe('/api/proxy/airlabs/delays?type=arrivals&dep_iata=FRA&arr_iata=MUC&airline_iata=LH');
  });
});

describe('API.cargos', () => {
  it('returns the bare endpoint when no filters supplied', () => {
    expect(API.cargos()).toBe('/api/proxy/airlabs/cargos');
  });

  it('uppercases flag + airline_icao but leaves bbox/_fields untouched', () => {
    expect(API.cargos({ fields: 'hex,lat,lng', airlineIcao: 'fdx', bbox: '1,2,3,4', flag: 'us' }))
      .toContain('flag=US');
    expect(API.cargos({ airlineIcao: 'fdx' })).toContain('airline_icao=FDX');
  });
});
