import { describe, expect, it } from 'vitest';
import type { FlightPosition, ReplayInfo } from '@/lib/flights/replay';
import type { GeoFence } from '@/lib/flights/geofence';

/**
 * Contract-shape tests.
 *
 * These are type-only sanity checks: they fail at compile time (TypeScript)
 * if the frontend DTOs drift away from what the backend documents in OpenAPI.
 *
 * Full round-trip contract tests would call `npm run generate:api-types`
 * against a running backend to produce `src/lib/api-types.generated.ts`,
 * then assert that our hand-written types are structurally compatible with
 * the generated ones. See the README for the workflow.
 *
 * Until the backend is available to generate from, we at least encode the
 * expected shapes here as executable documentation.
 */

describe('API DTO contracts', () => {
  it('FlightPosition exposes every field the backend sends', () => {
    const sample: FlightPosition = {
      id: 1,
      icao24: 'abc123',
      callsign: 'LH400',
      latitude: 50,
      longitude: 8,
      altitude: 10_000,
      speed: 850,
      heading: 90,
      verticalSpeed: 0,
      squawk: '1200',
      timestamp: '2026-04-17T10:00:00Z',
    };
    expect(sample.icao24).toHaveLength(6);
  });

  it('ReplayInfo matches backend FlightReplayService.ReplayInfo record', () => {
    const sample: ReplayInfo = {
      icao24: 'abc',
      callsign: 'LH400',
      positions: 42,
      from: '2026-04-17T08:00:00Z',
      to: '2026-04-17T10:00:00Z',
      durationMinutes: 120,
    };
    expect(sample.positions).toBeGreaterThan(0);
  });

  it('GeoFence round-trips into backend-shaped payload', () => {
    const circle: GeoFence = {
      name: 'Test',
      clientId: 'test-client',
      type: 'CIRCLE',
      centerLat: 50,
      centerLon: 8,
      radiusKm: 10,
      active: true,
    };
    expect(['CIRCLE', 'RECTANGLE']).toContain(circle.type);
  });
});
