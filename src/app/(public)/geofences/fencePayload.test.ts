// @vitest-environment happy-dom
/**
 * fencePayload.ts is pure validation + transformation logic — no UI, no fetch.
 * Tests run against the real implementation; localStorage (touched by
 * getOrCreateClientId) lives in happy-dom so no manual stub is needed.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { BLANK_FORM, buildFencePayload, type FenceFormState } from '@/app/(public)/geofences/fencePayload';
import type { GeoFenceDraft } from '@/components/geofence/GeoFenceDrawMap';

function form(overrides: Partial<FenceFormState> = {}): FenceFormState {
  return { ...BLANK_FORM, name: 'Test fence', ...overrides };
}

describe('buildFencePayload — circle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('rejects an empty name with a clear error', () => {
    const r = buildFencePayload(form({ name: '' }), null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name required/i);
  });

  it('rejects a name that is just whitespace', () => {
    const r = buildFencePayload(form({ name: '   ' }), null);
    expect(r.ok).toBe(false);
  });

  it('rejects lat outside [-90, 90]', () => {
    const r = buildFencePayload(form({ centerLat: '95', centerLon: '0', radiusKm: '10' }), null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/lat/i);
  });

  it('rejects lon outside [-180, 180]', () => {
    const r = buildFencePayload(form({ centerLat: '0', centerLon: '200', radiusKm: '10' }), null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/lon/i);
  });

  it('rejects non-positive radius', () => {
    const r = buildFencePayload(form({ centerLat: '50', centerLon: '8', radiusKm: '0' }), null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/radius/i);
  });

  it('builds a valid CIRCLE payload with optional filters', () => {
    const r = buildFencePayload(
      form({
        name: 'FRA approach',
        centerLat: '50.0379',
        centerLon: '8.5622',
        radiusKm: '50',
        minAltitudeFt: '1000',
        maxAltitudeFt: '10000',
        airlineFilter: 'DLH',
      }),
      null,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload).toMatchObject({
        name: 'FRA approach',
        type: 'CIRCLE',
        centerLat: 50.0379,
        centerLon: 8.5622,
        radiusKm: 50,
        minAltitudeFt: 1000,
        maxAltitudeFt: 10000,
        airlineFilter: 'DLH',
        active: true,
      });
      expect(typeof r.payload.clientId).toBe('string');
      expect(r.payload.clientId.length).toBeGreaterThan(0);
    }
  });

  it('leaves filter fields as null when blank (not 0, not empty-string)', () => {
    const r = buildFencePayload(
      form({ centerLat: '50', centerLon: '8', radiusKm: '50' }),
      null,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.minAltitudeFt).toBeNull();
      expect(r.payload.maxAltitudeFt).toBeNull();
      expect(r.payload.airlineFilter).toBeNull();
    }
  });

  it('preserves the new maxAltitudeFt field on the payload', () => {
    const r = buildFencePayload(
      form({ centerLat: '50', centerLon: '8', radiusKm: '50', maxAltitudeFt: '5000' }),
      null,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.maxAltitudeFt).toBe(5000);
  });
});

describe('buildFencePayload — rectangle', () => {
  const rectDraft: GeoFenceDraft = {
    type: 'RECTANGLE',
    northLat: 51,
    southLat: 47,
    eastLon: 12,
    westLon: 5,
  };

  it('takes the bbox from the draft, not the form', () => {
    // centerLat/centerLon/radiusKm are intentionally garbage here — they
    // must be ignored because the rectangle branch ignores circle fields.
    const r = buildFencePayload(
      form({ name: 'Bavaria', centerLat: '999', centerLon: '999', radiusKm: '-1' }),
      rectDraft,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.type).toBe('RECTANGLE');
      expect(r.payload).toMatchObject({
        northLat: 51,
        southLat: 47,
        eastLon: 12,
        westLon: 5,
      });
    }
  });

  it('still requires a non-empty name for rectangles', () => {
    const r = buildFencePayload(form({ name: '' }), rectDraft);
    expect(r.ok).toBe(false);
  });
});
