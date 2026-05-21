import { describe, expect, it } from 'vitest';
import {
  buildMarkerIconHtml,
  buildSelectedTooltipHtml,
  gridSampleAircraft,
} from './aircraftMarkerHelpers';
import type { AircraftState } from '@/lib/types';

function makeAircraft(over: Partial<AircraftState> = {}): AircraftState {
  return {
    icao24: '4b1234',
    callsign: 'TEST1',
    originCountry: 'CH',
    latitude: 48,
    longitude: 9,
    baroAltitude: 11000,
    onGround: false,
    velocity: 240,
    trueTrack: 90,
    verticalRate: 0,
    squawk: null,
    ...over,
  } as AircraftState;
}

describe('gridSampleAircraft', () => {
  const bounds = { south: 40, north: 55, west: 0, east: 20, zoom: 5 };

  it('returns the input unchanged when count is under the cap', () => {
    const list = [makeAircraft({ icao24: 'a' }), makeAircraft({ icao24: 'b' })];
    expect(gridSampleAircraft(list, bounds)).toBe(list);
  });

  it('returns the input unchanged when zoom is >= 7 (user is already close enough)', () => {
    const many: AircraftState[] = [];
    for (let i = 0; i < 2000; i++) {
      many.push(makeAircraft({ icao24: `id-${i}`, latitude: 48 + (i % 10) * 0.1, longitude: 9 + (i % 10) * 0.1 }));
    }
    expect(gridSampleAircraft(many, { ...bounds, zoom: 8 })).toBe(many);
  });

  it('samples down to roughly cellsPerSide^2 cells when over the cap and zoomed out', () => {
    const many: AircraftState[] = [];
    // 50×50 cluster of distinct positions = 2500 aircraft, well above the cap.
    for (let lat = 40; lat < 50; lat += 0.2) {
      for (let lon = 0; lon < 10; lon += 0.2) {
        many.push(makeAircraft({ icao24: `${lat}-${lon}`, latitude: lat, longitude: lon }));
      }
    }
    const sampled = gridSampleAircraft(many, { ...bounds, zoom: 5 });
    expect(sampled.length).toBeLessThan(many.length);
    // We expect at most cellsPerSide^2 entries (cap ≈ MAX_VISIBLE_MARKERS).
    expect(sampled.length).toBeLessThanOrEqual(1100);
  });

  it('prefers aircraft with a callsign when two land in the same cell', () => {
    const list = [
      makeAircraft({ icao24: 'a', callsign: undefined, latitude: 45, longitude: 5 }),
      makeAircraft({ icao24: 'b', callsign: 'DLH123', latitude: 45.0001, longitude: 5.0001 }),
    ];
    // Force the grid path by exceeding the cap — duplicate the list 800 times in a tiny bbox.
    const many: AircraftState[] = [];
    for (let i = 0; i < 800; i++) many.push(...list);
    const sampled = gridSampleAircraft(many, { south: 44, north: 46, west: 4, east: 6, zoom: 4 });
    // Whichever representative was kept, it must be the one with a callsign
    // when both options share the same cell.
    const survivor = sampled.find((a) => a.icao24 === 'a' || a.icao24 === 'b');
    expect(survivor?.callsign).toBe('DLH123');
  });
});

describe('buildMarkerIconHtml', () => {
  it('includes the rotation transform in the HTML', () => {
    const html = buildMarkerIconHtml({ size: 20, rotation: 135, color: '#fff', isSelected: false, isEmergency: false });
    expect(html).toContain('rotate(135deg)');
  });

  it('renders an emergency pulse ring when isEmergency=true', () => {
    const html = buildMarkerIconHtml({ size: 20, rotation: 0, color: '#f00', isSelected: false, isEmergency: true });
    expect(html).toContain('squawk-pulse');
  });

  it('renders a selected radar ring when isSelected=true and not emergency', () => {
    const html = buildMarkerIconHtml({ size: 32, rotation: 0, color: '#0ff', isSelected: true, isEmergency: false });
    expect(html).toContain('ring-pulse');
  });

  it('emergency animation wins over selected when both flags are set', () => {
    const html = buildMarkerIconHtml({ size: 32, rotation: 0, color: '#f00', isSelected: true, isEmergency: true });
    expect(html).toContain('squawk-pulse');
    expect(html).not.toContain('ring-pulse');
  });

  it('shows no outer ring for idle markers', () => {
    const html = buildMarkerIconHtml({ size: 18, rotation: 0, color: '#888', isSelected: false, isEmergency: false });
    expect(html).not.toContain('squawk-pulse');
    expect(html).not.toContain('ring-pulse');
  });
});

describe('buildSelectedTooltipHtml', () => {
  it('renders FL-style altitude when airborne above 1000 ft equivalent', () => {
    // 11 000 m = 36 089 ft → FL360 (rounded)
    const html = buildSelectedTooltipHtml({
      label: 'DLH123',
      color: '#fff',
      baroAltitudeMeters: 11000,
      onGround: false,
    });
    expect(html).toContain('FL');
    expect(html).toMatch(/FL\d{3}/);
  });

  it('renders GND when the aircraft is on the ground', () => {
    const html = buildSelectedTooltipHtml({
      label: 'DLH123',
      color: '#fff',
      baroAltitudeMeters: 0,
      onGround: true,
    });
    expect(html).toContain('GND');
  });

  it('omits the altitude span entirely when baroAltitude is unknown and not on ground', () => {
    const html = buildSelectedTooltipHtml({
      label: 'DLH123',
      color: '#fff',
      baroAltitudeMeters: undefined,
      onGround: false,
    });
    expect(html).not.toContain('FL');
    expect(html).not.toContain('GND');
    expect(html).toContain('DLH123');
  });

  it('pads FL numbers to 3 digits (FL050 not FL50)', () => {
    // 1600 m = ~5249 ft → FL052
    const html = buildSelectedTooltipHtml({
      label: 'A1',
      color: '#fff',
      baroAltitudeMeters: 1600,
      onGround: false,
    });
    expect(html).toMatch(/FL0\d{2}/);
  });
});
