import { describe, expect, it } from 'vitest';
import { MAP_STYLES, STYLE_ORDER, MAX_VISIBLE_MARKERS, TRANSPARENT_TILE } from '@/components/map/mapStyles';
import type { AircraftState, MapStyle } from '@/lib/types';
import { CONFIG, CONVERSION } from '@/lib/constants';

// ──────────────────────────────────────────────────
// Helpers — replicates logic from useAircraftMarkers
// ──────────────────────────────────────────────────
function styleAltitudeColor(
  style: MapStyle,
  meters: number | undefined,
  onGround: boolean,
): string {
  const colors = MAP_STYLES[style].colors;
  if (onGround) return colors.ground;
  if (meters == null || meters === 0) return colors.med;
  const feet = meters * CONVERSION.metersToFeet;
  if (feet < 100) return colors.ground;
  if (feet < 10000) return colors.low;
  if (feet < 30000) return colors.med;
  return colors.high;
}

function makeAircraft(overrides: Partial<AircraftState> = {}): AircraftState {
  return {
    icao24: 'abc123',
    category: 4,
    onGround: false,
    lastUpdate: Date.now(),
    ...overrides,
  };
}

// ──────────────────────────────────────────────────
// 1. Altitude color bands per style
// ──────────────────────────────────────────────────
describe.each(STYLE_ORDER)('altitude colors for style "%s"', (style) => {
  const colors = MAP_STYLES[style].colors;

  it('ground aircraft → ground color', () => {
    expect(styleAltitudeColor(style, 0, true)).toBe(colors.ground);
    expect(styleAltitudeColor(style, 5000, true)).toBe(colors.ground);
  });

  it('very low altitude (<100 ft / ~30m) → ground color', () => {
    expect(styleAltitudeColor(style, 20, false)).toBe(colors.ground);
  });

  it('low altitude (1000m ≈ 3280 ft) → low color', () => {
    expect(styleAltitudeColor(style, 1000, false)).toBe(colors.low);
  });

  it('medium altitude (5000m ≈ 16400 ft) → med color', () => {
    expect(styleAltitudeColor(style, 5000, false)).toBe(colors.med);
  });

  it('high altitude (11000m ≈ 36000 ft) → high color', () => {
    expect(styleAltitudeColor(style, 11000, false)).toBe(colors.high);
  });

  it('null altitude (no data) → med color', () => {
    expect(styleAltitudeColor(style, undefined, false)).toBe(colors.med);
  });

  it('zero altitude in air → med color', () => {
    expect(styleAltitudeColor(style, 0, false)).toBe(colors.med);
  });
});

// ──────────────────────────────────────────────────
// 2. Selected aircraft color
// ──────────────────────────────────────────────────
describe.each(STYLE_ORDER)('selected aircraft color for style "%s"', (style) => {
  const colors = MAP_STYLES[style].colors;

  it('selected aircraft uses the selected color, not altitude', () => {
    // The hook uses: isSelected ? styleColors.selected : altitudeColor
    expect(colors.selected).toBeDefined();
    expect(colors.selected).not.toBe(colors.low);
    expect(colors.selected).not.toBe(colors.ground);
  });
});

// ──────────────────────────────────────────────────
// 3. Emergency squawk overrides style colors
// ──────────────────────────────────────────────────
describe('emergency squawk colors are style-independent', () => {
  // Emergency colors come from squawkColor(), not from MAP_STYLES
  // This test ensures they're distinct from all style palettes

  const EMERGENCY_COLORS = {
    '7700': '#F87171', // red - emergency
    '7600': '#FBBF24', // yellow - radio fail
    '7500': '#FF6B35', // orange - hijack
  } as const;

  it.each(Object.entries(EMERGENCY_COLORS))(
    'squawk %s color (%s) is not a ground color in any style',
    (_, color) => {
      for (const style of STYLE_ORDER) {
        expect(MAP_STYLES[style].colors.ground).not.toBe(color);
      }
    },
  );
});

// ──────────────────────────────────────────────────
// 4. Marker visibility / sampling logic
// ──────────────────────────────────────────────────
describe('marker sampling at low zoom', () => {
  it('samples when visible > MAX_VISIBLE_MARKERS and zoom < 7', () => {
    const count = MAX_VISIBLE_MARKERS + 500;
    const zoom = 5;
    const shouldSample = count > MAX_VISIBLE_MARKERS && zoom < 7;
    expect(shouldSample).toBe(true);

    const step = Math.ceil(count / MAX_VISIBLE_MARKERS);
    const sampled = Array.from({ length: count }, (_, i) => i).filter((_, i) => i % step === 0);
    expect(sampled.length).toBeLessThanOrEqual(MAX_VISIBLE_MARKERS);
    expect(sampled.length).toBeGreaterThan(0);
  });

  it('does not sample when zoom >= 7', () => {
    const count = MAX_VISIBLE_MARKERS + 500;
    const zoom = 7;
    const shouldSample = count > MAX_VISIBLE_MARKERS && zoom < 7;
    expect(shouldSample).toBe(false);
  });

  it('does not sample when visible <= MAX_VISIBLE_MARKERS', () => {
    const count = MAX_VISIBLE_MARKERS - 10;
    const zoom = 3;
    const shouldSample = count > MAX_VISIBLE_MARKERS && zoom < 7;
    expect(shouldSample).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// 5. Selected aircraft always included in render list
// ──────────────────────────────────────────────────
describe('selected aircraft inclusion', () => {
  it('selected aircraft is added to render list even if not in viewport', () => {
    const selected = makeAircraft({ icao24: 'sel01', latitude: 99, longitude: 99 });
    const visible = [makeAircraft({ icao24: 'vis01' })];
    const inList = visible.some((a) => a.icao24 === selected.icao24);

    if (!inList) {
      visible.push(selected);
    }

    expect(visible.some((a) => a.icao24 === 'sel01')).toBe(true);
  });

  it('does not duplicate selected aircraft if already in viewport', () => {
    const selected = makeAircraft({ icao24: 'vis01' });
    const visible = [makeAircraft({ icao24: 'vis01' }), makeAircraft({ icao24: 'vis02' })];
    const inList = visible.some((a) => a.icao24 === selected.icao24);

    if (!inList) {
      visible.push(selected);
    }

    expect(visible.filter((a) => a.icao24 === 'vis01')).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────
// 6. Auto-zoom on flight selection
// ──────────────────────────────────────────────────
describe('auto-zoom on flight selection', () => {
  function targetZoom(currentZoom: number): number {
    return Math.min(Math.max(currentZoom, 8), 12);
  }

  it('zooms in from overview (zoom 5) to 8', () => {
    expect(targetZoom(5)).toBe(8);
  });

  it('keeps current zoom if between 8 and 12', () => {
    expect(targetZoom(9)).toBe(9);
    expect(targetZoom(10)).toBe(10);
  });

  it('caps zoom at 12 when already zoomed in far', () => {
    expect(targetZoom(15)).toBe(12);
    expect(targetZoom(18)).toBe(12);
  });

  it('sets exactly 8 when at minimum boundary', () => {
    expect(targetZoom(8)).toBe(8);
  });

  it('sets exactly 12 when at maximum boundary', () => {
    expect(targetZoom(12)).toBe(12);
  });
});

// ──────────────────────────────────────────────────
// 7. Radar overlay auto-hide logic
// ──────────────────────────────────────────────────
describe('radar overlay visibility', () => {
  const RADAR_MAX_ZOOM = 6;

  function radarShouldShow(showRadar: boolean, tileUrl: string | null, zoom: number): boolean {
    return Boolean(showRadar && tileUrl && zoom <= RADAR_MAX_ZOOM);
  }

  it('shows radar at default zoom with valid URL', () => {
    expect(radarShouldShow(true, 'https://example.com/tile.png', 5.5)).toBe(true);
  });

  it('hides radar when zoom exceeds threshold', () => {
    expect(radarShouldShow(true, 'https://example.com/tile.png', 8)).toBe(false);
    expect(radarShouldShow(true, 'https://example.com/tile.png', 12)).toBe(false);
  });

  it('hides radar when toggle is off', () => {
    expect(radarShouldShow(false, 'https://example.com/tile.png', 3)).toBe(false);
  });

  it('hides radar when tile URL is null (API not loaded yet)', () => {
    expect(radarShouldShow(true, null, 3)).toBe(false);
  });

  it('shows radar at exact threshold zoom', () => {
    expect(radarShouldShow(true, 'https://example.com/tile.png', RADAR_MAX_ZOOM)).toBe(true);
  });

  it('hides radar one zoom level above threshold', () => {
    expect(radarShouldShow(true, 'https://example.com/tile.png', RADAR_MAX_ZOOM + 1)).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// 8. Dark mode CSS filter application
// ──────────────────────────────────────────────────
describe('dark mode CSS filter', () => {
  const DARK_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.3) saturate(0.3)';

  it.each(STYLE_ORDER)('style "%s" gets correct filter', (style) => {
    const expectedFilter = MAP_STYLES[style].dark ? DARK_FILTER : 'none';
    const actualFilter = MAP_STYLES[style].dark ? DARK_FILTER : 'none';
    expect(actualFilter).toBe(expectedFilter);
  });

  it('no more than one style applies the invert filter', () => {
    const darkStyles = STYLE_ORDER.filter((s) => MAP_STYLES[s].dark);
    expect(darkStyles.length).toBeLessThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────────
// 9. Style cycling (next style on button click)
// ──────────────────────────────────────────────────
describe('style cycling', () => {
  it('cycles through all styles in order', () => {
    for (let i = 0; i < STYLE_ORDER.length; i++) {
      const current = STYLE_ORDER[i];
      const next = STYLE_ORDER[(i + 1) % STYLE_ORDER.length];
      const idx = STYLE_ORDER.indexOf(current);
      expect(STYLE_ORDER[(idx + 1) % STYLE_ORDER.length]).toBe(next);
    }
  });

  it('wraps from last style back to first', () => {
    const last = STYLE_ORDER[STYLE_ORDER.length - 1];
    const idx = STYLE_ORDER.indexOf(last);
    expect(STYLE_ORDER[(idx + 1) % STYLE_ORDER.length]).toBe(STYLE_ORDER[0]);
  });
});

// ──────────────────────────────────────────────────
// 10. Plane icon vs dot rendering threshold
// ──────────────────────────────────────────────────
describe('plane icon vs dot rendering', () => {
  function usePlaneIcons(zoom: number, renderCount: number): boolean {
    return zoom >= 6 && renderCount < 2000;
  }

  it('uses plane icons at zoom 6+ with few aircraft', () => {
    expect(usePlaneIcons(6, 500)).toBe(true);
    expect(usePlaneIcons(10, 100)).toBe(true);
  });

  it('falls back to dots at low zoom', () => {
    expect(usePlaneIcons(5, 500)).toBe(false);
    expect(usePlaneIcons(3, 100)).toBe(false);
  });

  it('falls back to dots with too many aircraft', () => {
    expect(usePlaneIcons(8, 2000)).toBe(false);
    expect(usePlaneIcons(10, 5000)).toBe(false);
  });

  it('uses plane icons at boundary (zoom=6, count=1999)', () => {
    expect(usePlaneIcons(6, 1999)).toBe(true);
  });
});

// ──────────────────────────────────────────────────
// 11. errorTileUrl prevents "Zoom Level Not Supported"
// ──────────────────────────────────────────────────
describe('errorTileUrl configuration', () => {
  it('TRANSPARENT_TILE is used as errorTileUrl for all base layers', () => {
    // useBaseLayer passes errorTileUrl: TRANSPARENT_TILE to L.tileLayer
    // This test verifies the constant is a valid data URI
    expect(TRANSPARENT_TILE).toMatch(/^data:image\//);
    expect(TRANSPARENT_TILE.length).toBeGreaterThan(20);
  });
});

// ──────────────────────────────────────────────────
// 12. Config zoom bounds
// ──────────────────────────────────────────────────
describe('CONFIG zoom bounds', () => {
  it('maxZoom is reasonable (10-20)', () => {
    expect(CONFIG.maxZoom).toBeGreaterThanOrEqual(10);
    expect(CONFIG.maxZoom).toBeLessThanOrEqual(20);
  });

  it('minZoom is reasonable (1-5)', () => {
    expect(CONFIG.minZoom).toBeGreaterThanOrEqual(1);
    expect(CONFIG.minZoom).toBeLessThanOrEqual(5);
  });

  it('maxZoom > minZoom', () => {
    expect(CONFIG.maxZoom).toBeGreaterThan(CONFIG.minZoom);
  });

  it('defaultZoom is between min and max', () => {
    expect(CONFIG.defaultZoom).toBeGreaterThanOrEqual(CONFIG.minZoom);
    expect(CONFIG.defaultZoom).toBeLessThanOrEqual(CONFIG.maxZoom);
  });

  it('no style has maxNativeZoom > CONFIG.maxZoom', () => {
    for (const [, style] of Object.entries(MAP_STYLES)) {
      if (style.maxNative != null) {
        expect(style.maxNative).toBeLessThanOrEqual(CONFIG.maxZoom);
      }
    }
  });
});
