import { describe, expect, it } from 'vitest';
import { collectVisibleAircraft } from '@/app/(public)/ar/visibleAircraft';
import type { Viewport } from '@/app/(public)/ar/arProjection';
import type { AircraftState } from '@/lib/types';

const VIEWPORT: Viewport = { width: 400, height: 800, fovHorizontalDeg: 60, fovVerticalDeg: 80 };
const OBSERVER = { lat: 50, lon: 10 };

function ac(overrides: Partial<AircraftState>): AircraftState {
  return {
    icao24: 'abc123',
    category: 4,
    onGround: false,
    lastUpdate: 0,
    latitude: 50.1,
    longitude: 10,
    baroAltitude: 10_000,
    ...overrides,
  };
}

function mapOf(list: AircraftState[]): Map<string, AircraftState> {
  return new Map(list.map((a) => [a.icao24, a]));
}

describe('collectVisibleAircraft', () => {
  it('excludes on-ground aircraft', () => {
    const map = mapOf([ac({ icao24: 'g', onGround: true })]);
    const out = collectVisibleAircraft({
      aircraftMap: map, observer: OBSERVER, orientation: { heading: 0, pitch: 0 }, viewport: VIEWPORT,
    });
    expect(out).toHaveLength(0);
  });

  it('excludes aircraft without position or altitude', () => {
    const map = mapOf([
      ac({ icao24: 'a', latitude: undefined }),
      ac({ icao24: 'b', baroAltitude: 0 }),
    ]);
    const out = collectVisibleAircraft({
      aircraftMap: map, observer: OBSERVER, orientation: { heading: 0, pitch: 0 }, viewport: VIEWPORT,
    });
    expect(out).toHaveLength(0);
  });

  it('includes an aircraft roughly above the north-pointing camera', () => {
    // Slightly north of observer → bearing ~0°, so it should be in view when heading=0
    const map = mapOf([ac({ latitude: 50.05, longitude: 10, baroAltitude: 10_000 })]);
    const out = collectVisibleAircraft({
      aircraftMap: map, observer: OBSERVER, orientation: { heading: 0, pitch: 45 }, viewport: VIEWPORT,
    });
    expect(out).toHaveLength(1);
    expect(out[0].screen.inView).toBe(true);
    expect(out[0].distanceKm).toBeLessThan(10);
  });

  it('sorts by distance (nearest first)', () => {
    const map = mapOf([
      ac({ icao24: 'far',  latitude: 50.5, longitude: 10, baroAltitude: 10_000 }),
      ac({ icao24: 'near', latitude: 50.05, longitude: 10, baroAltitude: 10_000 }),
    ]);
    const out = collectVisibleAircraft({
      aircraftMap: map, observer: OBSERVER, orientation: { heading: 0, pitch: 45 }, viewport: VIEWPORT,
    });
    expect(out.map((e) => e.aircraft.icao24)).toEqual(['near', 'far']);
  });

  it('drops aircraft beyond the 200 km distance cap', () => {
    const map = mapOf([ac({ latitude: 55, longitude: 10, baroAltitude: 10_000 })]);
    const out = collectVisibleAircraft({
      aircraftMap: map, observer: OBSERVER, orientation: { heading: 0, pitch: 0 }, viewport: VIEWPORT,
    });
    expect(out).toHaveLength(0);
  });
});
