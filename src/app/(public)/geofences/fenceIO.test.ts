// @vitest-environment node
/**
 * Export/import is the most failure-sensitive feature of the page —
 * a malformed export would silently corrupt the user's catalogue.
 * Test the round-trip + every schema rejection path.
 */
import { describe, expect, it } from 'vitest';
import {
  EXPORT_FILE_VERSION,
  adoptForLocalClient,
  buildExportEnvelope,
  parseImportFile,
} from '@/app/(public)/geofences/fenceIO';
import type { GeoFence } from '@/lib/schemas';

const CIRCLE: GeoFence = {
  id: 42,
  name: 'FRA approach',
  clientId: 'browser-a',
  type: 'CIRCLE',
  centerLat: 50.0379,
  centerLon: 8.5622,
  radiusKm: 50,
  minAltitudeFt: 1000,
  maxAltitudeFt: null,
  airlineFilter: 'DLH',
  active: true,
};

const RECT: GeoFence = {
  id: 7,
  name: 'Bavaria',
  clientId: 'browser-a',
  type: 'RECTANGLE',
  northLat: 51, southLat: 47, eastLon: 12, westLon: 5,
  minAltitudeFt: null, maxAltitudeFt: null, airlineFilter: null,
  active: true,
};

describe('buildExportEnvelope()', () => {
  it('stamps the schema version and an ISO timestamp', () => {
    const env = buildExportEnvelope([], 0);
    expect(env.version).toBe(EXPORT_FILE_VERSION);
    expect(env.exportedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(env.fences).toEqual([]);
  });

  it('strips id and clientId from each fence', () => {
    const env = buildExportEnvelope([CIRCLE, RECT]);
    expect(env.fences).toHaveLength(2);
    for (const f of env.fences) {
      expect('id' in f).toBe(false);
      expect('clientId' in f).toBe(false);
    }
  });

  it('preserves every other field for round-trip fidelity', () => {
    const env = buildExportEnvelope([CIRCLE]);
    expect(env.fences[0]).toMatchObject({
      name: 'FRA approach',
      type: 'CIRCLE',
      centerLat: 50.0379,
      centerLon: 8.5622,
      radiusKm: 50,
      minAltitudeFt: 1000,
      maxAltitudeFt: null,
      airlineFilter: 'DLH',
      active: true,
    });
  });
});

describe('parseImportFile()', () => {
  it('round-trips a JSON-serialised envelope', () => {
    const original = buildExportEnvelope([CIRCLE, RECT]);
    const text = JSON.stringify(original);
    const result = parseImportFile(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.version).toBe(EXPORT_FILE_VERSION);
      expect(result.envelope.fences).toHaveLength(2);
      expect(result.envelope.fences[0]).toMatchObject({ name: 'FRA approach', type: 'CIRCLE' });
      expect(result.envelope.fences[1]).toMatchObject({ name: 'Bavaria', type: 'RECTANGLE' });
    }
  });

  it('rejects non-JSON input with a readable error', () => {
    const r = parseImportFile('not-json-at-all');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/invalid json/i);
  });

  it('rejects an envelope with the wrong version literal', () => {
    const r = parseImportFile(JSON.stringify({ version: 99, exportedAt: 'x', fences: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toMatch(/version/);
  });

  it('rejects a fence with an out-of-range lat', () => {
    const bad = {
      version: 1,
      exportedAt: 'x',
      fences: [{ name: 'x', type: 'CIRCLE', centerLat: 95, centerLon: 0, radiusKm: 10 }],
    };
    const r = parseImportFile(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/centerLat/);
  });

  it('rejects a fence with a non-positive radius', () => {
    const bad = {
      version: 1,
      exportedAt: 'x',
      fences: [{ name: 'x', type: 'CIRCLE', centerLat: 0, centerLon: 0, radiusKm: 0 }],
    };
    const r = parseImportFile(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/radiusKm/);
  });

  it('rejects a fence missing required name', () => {
    const bad = { version: 1, exportedAt: 'x', fences: [{ type: 'CIRCLE' }] };
    const r = parseImportFile(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/i);
  });

  it('rejects a top-level array (legacy format)', () => {
    const r = parseImportFile(JSON.stringify([CIRCLE]));
    expect(r.ok).toBe(false);
  });
});

describe('adoptForLocalClient()', () => {
  it('grafts the local clientId onto the imported fence', () => {
    const imported = buildExportEnvelope([CIRCLE]).fences[0]!;
    const owned = adoptForLocalClient(imported, 'browser-b');
    expect(owned.clientId).toBe('browser-b');
    expect(owned.name).toBe('FRA approach');
  });

  it('defaults active to true when omitted', () => {
    const imported = { ...buildExportEnvelope([CIRCLE]).fences[0]! };
    delete (imported as Record<string, unknown>).active;
    const owned = adoptForLocalClient(imported, 'browser-b');
    expect(owned.active).toBe(true);
  });

  it('preserves an explicit active=false from the imported file', () => {
    const imported = { ...buildExportEnvelope([CIRCLE]).fences[0]!, active: false };
    const owned = adoptForLocalClient(imported, 'browser-b');
    expect(owned.active).toBe(false);
  });
});
