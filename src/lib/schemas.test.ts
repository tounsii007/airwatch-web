import { describe, expect, it } from 'vitest';
import {
  AirlabsFlightSchema,
  AirlabsFlightsResponseSchema,
  FlightPositionSchema,
  GeoFenceSchema,
  ReplayInfoSchema,
  safeParse,
  safeParseArray,
} from '@/lib/schemas';

describe('zod schemas at API boundary', () => {
  describe('AirlabsFlightSchema', () => {
    it('accepts a minimal valid flight', () => {
      const r = AirlabsFlightSchema.safeParse({ hex: 'abc', lat: 50, lng: 8 });
      expect(r.success).toBe(true);
    });

    it('tolerates extra unknown fields (passthrough)', () => {
      const r = AirlabsFlightSchema.safeParse({ hex: 'abc', future_field: 42 });
      expect(r.success).toBe(true);
    });

    it('rejects wrong types', () => {
      const r = AirlabsFlightSchema.safeParse({ lat: 'not-a-number' });
      expect(r.success).toBe(false);
    });
  });

  describe('AirlabsFlightsResponseSchema', () => {
    it('accepts the error-envelope shape', () => {
      const r = AirlabsFlightsResponseSchema.safeParse({
        error: { code: 'rate_limited', message: 'too many requests' },
      });
      expect(r.success).toBe(true);
    });
  });

  describe('GeoFenceSchema', () => {
    it('accepts a valid circle', () => {
      const r = GeoFenceSchema.safeParse({
        name: 'Test',
        clientId: 'u',
        type: 'CIRCLE',
        centerLat: 50,
        centerLon: 8,
        radiusKm: 10,
      });
      expect(r.success).toBe(true);
    });

    it('rejects lat > 90', () => {
      const r = GeoFenceSchema.safeParse({
        name: 'x',
        clientId: 'u',
        type: 'CIRCLE',
        centerLat: 91,
        centerLon: 0,
        radiusKm: 1,
      });
      expect(r.success).toBe(false);
    });

    it('rejects unknown fence type', () => {
      const r = GeoFenceSchema.safeParse({
        name: 'x',
        clientId: 'u',
        type: 'TRIANGLE',
      });
      expect(r.success).toBe(false);
    });
  });

  describe('FlightPositionSchema', () => {
    it('round-trips a realistic row', () => {
      const row = {
        id: 1,
        icao24: 'abc123',
        callsign: 'LH400',
        latitude: 50,
        longitude: 8,
        altitude: 10000,
        speed: 850,
        heading: 90,
        verticalSpeed: 0,
        squawk: '1200',
        timestamp: '2026-04-17T10:00:00Z',
      };
      expect(FlightPositionSchema.parse(row)).toEqual(row);
    });

    it('allows nullable callsign / squawk', () => {
      const row = {
        id: 1,
        icao24: 'abc',
        callsign: null,
        latitude: 50,
        longitude: 8,
        altitude: 0,
        speed: 0,
        heading: 0,
        verticalSpeed: 0,
        squawk: null,
        timestamp: '2026-04-17T10:00:00Z',
      };
      expect(FlightPositionSchema.safeParse(row).success).toBe(true);
    });
  });

  describe('ReplayInfoSchema', () => {
    it('requires all expected fields', () => {
      const r = ReplayInfoSchema.safeParse({
        icao24: 'abc',
        callsign: 'LH400',
        positions: 42,
        from: 'x',
        to: 'y',
        durationMinutes: 10,
      });
      expect(r.success).toBe(true);
    });
  });

  describe('safeParse / safeParseArray', () => {
    it('safeParse returns null on failure', () => {
      expect(safeParse(GeoFenceSchema, { nope: true })).toBeNull();
    });

    it('safeParseArray drops malformed entries but keeps good ones', () => {
      const result = safeParseArray(
        AirlabsFlightSchema,
        [
          { hex: 'abc' },
          { lat: 'bad' }, // dropped
          { hex: 'def' },
        ],
        'test',
      );
      expect(result.items).toHaveLength(2);
      expect(result.dropped).toBe(1);
    });

    it('safeParseArray returns empty when input is not an array', () => {
      expect(safeParseArray(GeoFenceSchema, 'not-an-array').items).toEqual([]);
    });
  });
});
