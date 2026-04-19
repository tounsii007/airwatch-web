import type { GeoFence } from '@/lib/flights/geofence';
import { getOrCreateClientId } from '@/lib/flights/geofence';
import type { GeoFenceDraft } from '@/components/geofence/GeoFenceDrawMap';

export interface FenceFormState {
  name: string;
  centerLat: string;
  centerLon: string;
  radiusKm: string;
  minAltitudeFt: string;
  maxAltitudeFt: string;
  airlineFilter: string;
}

export const BLANK_FORM: FenceFormState = {
  name: '',
  centerLat: '',
  centerLon: '',
  radiusKm: '50',
  minAltitudeFt: '',
  maxAltitudeFt: '',
  airlineFilter: '',
};

export type FormResult = { ok: true; payload: GeoFence } | { ok: false; error: string };

function baseFilters(form: FenceFormState) {
  return {
    minAltitudeFt: form.minAltitudeFt ? parseInt(form.minAltitudeFt, 10) : null,
    maxAltitudeFt: form.maxAltitudeFt ? parseInt(form.maxAltitudeFt, 10) : null,
    airlineFilter: form.airlineFilter.trim() || null,
    active: true,
  };
}

function buildRectangle(form: FenceFormState, draft: GeoFenceDraft): FormResult {
  return {
    ok: true,
    payload: {
      name: form.name.trim(),
      clientId: getOrCreateClientId(),
      type: 'RECTANGLE',
      northLat: draft.northLat,
      southLat: draft.southLat,
      eastLon: draft.eastLon,
      westLon: draft.westLon,
      ...baseFilters(form),
    },
  };
}

function buildCircle(form: FenceFormState): FormResult {
  const lat = parseFloat(form.centerLat);
  const lon = parseFloat(form.centerLon);
  const radius = parseFloat(form.radiusKm);
  if (Number.isNaN(lat) || lat < -90 || lat > 90) return { ok: false, error: 'Lat must be in [-90, 90]' };
  if (Number.isNaN(lon) || lon < -180 || lon > 180) return { ok: false, error: 'Lon must be in [-180, 180]' };
  if (Number.isNaN(radius) || radius <= 0) return { ok: false, error: 'Radius must be > 0 km' };
  return {
    ok: true,
    payload: {
      name: form.name.trim(),
      clientId: getOrCreateClientId(),
      type: 'CIRCLE',
      centerLat: lat,
      centerLon: lon,
      radiusKm: radius,
      ...baseFilters(form),
    },
  };
}

/** Validate + convert the form into an API payload. */
export function buildFencePayload(form: FenceFormState, draft: GeoFenceDraft | null): FormResult {
  if (!form.name.trim()) return { ok: false, error: 'Name required' };
  if (draft?.type === 'RECTANGLE') return buildRectangle(form, draft);
  return buildCircle(form);
}
