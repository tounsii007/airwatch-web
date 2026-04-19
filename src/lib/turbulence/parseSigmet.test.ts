import { describe, expect, it } from 'vitest';
import { parseSigmetResponse, getSeverityColor } from './parseSigmet';

describe('parseSigmetResponse', () => {
  it('returns empty array for null/undefined/non-array', () => {
    expect(parseSigmetResponse(null)).toEqual([]);
    expect(parseSigmetResponse(undefined)).toEqual([]);
    expect(parseSigmetResponse({})).toEqual([]);
    expect(parseSigmetResponse('string')).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(parseSigmetResponse([])).toEqual([]);
  });

  it('filters out non-turbulence SIGMETs', () => {
    const data = [
      { hazard: 'ICE', severity: 'MOD', coords: '40 -80 41 -79 42 -80', airSigmetId: '1' },
      { hazard: 'TURB', severity: 'MOD', coords: '40 -80 41 -79 42 -80', airSigmetId: '2' },
    ];
    const result = parseSigmetResponse(data);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('parses coords from space-separated string', () => {
    const data = [{
      hazard: 'TURB',
      severity: 'MOD',
      coords: '40.5 -80.2 41.3 -79.1 42.0 -80.5',
      airSigmetId: 'test1',
    }];
    const result = parseSigmetResponse(data);
    expect(result).toHaveLength(1);
    expect(result[0].polygon).toEqual([
      [40.5, -80.2],
      [41.3, -79.1],
      [42.0, -80.5],
    ]);
  });

  it('parses coords from area array', () => {
    const data = [{
      hazard: 'TURB-HI',
      severity: 'SEV',
      area: [
        { lat: 50, lon: 10 },
        { lat: 51, lon: 11 },
        { lat: 52, lon: 10 },
      ],
      airSigmetId: 'test2',
    }];
    const result = parseSigmetResponse(data);
    expect(result).toHaveLength(1);
    expect(result[0].polygon).toEqual([[50, 10], [51, 11], [52, 10]]);
  });

  it('skips entries with fewer than 3 polygon points', () => {
    const data = [{
      hazard: 'TURB',
      severity: 'LGT',
      coords: '40 -80 41 -79',
      airSigmetId: 'too-few',
    }];
    expect(parseSigmetResponse(data)).toHaveLength(0);
  });

  it('skips entries with invalid coords', () => {
    const data = [{
      hazard: 'TURB',
      severity: 'MOD',
      coords: 'abc def ghi jkl mno pqr',
      airSigmetId: 'invalid',
    }];
    expect(parseSigmetResponse(data)).toHaveLength(0);
  });

  it('parses severity correctly', () => {
    const make = (sev: string) => [{
      hazard: 'TURB', severity: sev,
      coords: '40 -80 41 -79 42 -80',
      airSigmetId: `sev-${sev}`,
    }];
    expect(parseSigmetResponse(make('LGT'))[0].severity).toBe('light');
    expect(parseSigmetResponse(make('LIGHT'))[0].severity).toBe('light');
    expect(parseSigmetResponse(make('MOD'))[0].severity).toBe('moderate');
    expect(parseSigmetResponse(make('MODERATE'))[0].severity).toBe('moderate');
    expect(parseSigmetResponse(make('SEV'))[0].severity).toBe('severe');
    expect(parseSigmetResponse(make('SEVERE'))[0].severity).toBe('severe');
    expect(parseSigmetResponse(make('EXTREME'))[0].severity).toBe('severe');
  });

  it('parses altitude range', () => {
    const data = [{
      hazard: 'TURB',
      severity: 'MOD',
      coords: '40 -80 41 -79 42 -80',
      altitudeLow1: 200,
      altitudeHi1: 400,
      airSigmetId: 'alt-test',
    }];
    const result = parseSigmetResponse(data);
    expect(result[0].altitudeLow).toBe(200);
    expect(result[0].altitudeHigh).toBe(400);
  });

  it('generates fallback IDs when airSigmetId missing', () => {
    const data = [
      { hazard: 'TURB', severity: 'MOD', coords: '40 -80 41 -79 42 -80' },
      { hazard: 'TURB', severity: 'SEV', coords: '50 10 51 11 52 10' },
    ];
    const result = parseSigmetResponse(data);
    expect(result[0].id).toBe('sigmet-0');
    expect(result[1].id).toBe('sigmet-1');
  });
});

describe('getSeverityColor', () => {
  it('returns yellow for light', () => {
    expect(getSeverityColor('light')).toBe('#EAB308');
  });

  it('returns orange for moderate', () => {
    expect(getSeverityColor('moderate')).toBe('#F97316');
  });

  it('returns red for severe', () => {
    expect(getSeverityColor('severe')).toBe('#EF4444');
  });
});
