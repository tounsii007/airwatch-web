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
