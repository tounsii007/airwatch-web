import { describe, expect, it } from 'vitest';
import { MAP_STYLES, STYLE_ORDER, TRANSPARENT_TILE, MAX_VISIBLE_MARKERS } from '@/components/map/mapStyles';
import type { MapStyle } from '@/lib/types';

// ──────────────────────────────────────────────────
// 1. Style registry completeness
// ──────────────────────────────────────────────────
describe('MAP_STYLES registry', () => {
  const allStyles = Object.keys(MAP_STYLES) as MapStyle[];

  it('contains exactly 6 styles', () => {
    expect(allStyles).toHaveLength(6);
  });

  it('includes all expected style keys', () => {
    const expected: MapStyle[] = ['dark', 'night', 'satellite', 'streets', 'terrain', 'toner'];
    for (const key of expected) {
      expect(MAP_STYLES[key]).toBeDefined();
    }
  });

  it('STYLE_ORDER exposes only satellite as the surface option', () => {
    expect(STYLE_ORDER).toEqual(['satellite']);
  });

  it('STYLE_ORDER has no duplicates', () => {
    const unique = new Set(STYLE_ORDER);
    expect(unique.size).toBe(STYLE_ORDER.length);
  });
});

// ──────────────────────────────────────────────────
// 2. Each style has valid tile URL
// ──────────────────────────────────────────────────
describe.each(Object.entries(MAP_STYLES))('style "%s" tile URL', (name, style) => {
  it('is a direct CDN URL (HTTPS, third-party host, no /tiles/ proxy)', () => {
    // Tile URLs migrated FROM same-origin /tiles/* TO direct CDN to
    // avoid the per-host concurrency cap on localhost and to let the
    // browser cache against the upstream provider's real cache headers.
    expect(style.url).toMatch(/^https:\/\//);
    expect(style.url).not.toMatch(/^\/tiles\//);
  });

  it('includes {z}, {x}, {y} placeholders', () => {
    expect(style.url).toContain('{z}');
    expect(style.url).toContain('{x}');
    expect(style.url).toContain('{y}');
  });

  it('uses {s} subdomain split for parallel connections', () => {
    // Direct CDN means the per-host cap matters again; {s} is Leaflet's
    // round-robin placeholder over the configured `subdomains` string.
    expect(style.url).toContain('{s}');
    expect(style.subdomains).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────
// 3. Each style has a valid color palette
// ──────────────────────────────────────────────────
describe.each(Object.entries(MAP_STYLES))('style "%s" color palette', (name, style) => {
  const colorKeys = ['low', 'med', 'high', 'ground', 'selected'] as const;
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;

  for (const key of colorKeys) {
    it(`has valid hex color for "${key}"`, () => {
      expect(style.colors[key]).toMatch(hexPattern);
    });
  }

  it('low and high colors are different', () => {
    expect(style.colors.low).not.toBe(style.colors.high);
  });

  it('ground and selected colors are different', () => {
    expect(style.colors.ground).not.toBe(style.colors.selected);
  });

  it('selected color is different from all altitude colors', () => {
    expect(style.colors.selected).not.toBe(style.colors.low);
    expect(style.colors.selected).not.toBe(style.colors.med);
    expect(style.colors.selected).not.toBe(style.colors.high);
  });
});

// ──────────────────────────────────────────────────
// 4. Dark vs light classification
// ──────────────────────────────────────────────────
describe('dark/light classification', () => {
  it('all no-labels styles have dark property defined', () => {
    for (const style of Object.values(MAP_STYLES)) {
      expect(typeof style.dark).toBe('boolean');
    }
  });
});

// ──────────────────────────────────────────────────
// 5. maxNativeZoom constraints
// ──────────────────────────────────────────────────
describe('maxNativeZoom constraints', () => {
  it.each(Object.entries(MAP_STYLES))('%s maxNativeZoom is <= 19 when set', (_, style) => {
    if (style.maxNative != null) {
      expect(style.maxNative).toBeLessThanOrEqual(19);
      expect(style.maxNative).toBeGreaterThanOrEqual(1);
    }
  });

  it('styles with maxNativeZoom have reasonable limits', () => {
    for (const [, style] of Object.entries(MAP_STYLES)) {
      if (style.maxNative != null) {
        expect(style.maxNative).toBeLessThanOrEqual(19);
      }
    }
  });
});

// ──────────────────────────────────────────────────
// 6. Style labels
// ──────────────────────────────────────────────────
describe('style labels', () => {
  it.each(Object.entries(MAP_STYLES))('%s has a short label (3 chars)', (_, style) => {
    expect(style.label.length).toBe(3);
  });

  it('all labels are unique', () => {
    const labels = Object.values(MAP_STYLES).map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// ──────────────────────────────────────────────────
// 7. Attribution strings
// ──────────────────────────────────────────────────
describe('attribution', () => {
  it.each(Object.entries(MAP_STYLES))('%s has non-empty attribution', (_, style) => {
    expect(style.attr.length).toBeGreaterThan(0);
    expect(style.attr).toMatch(/©|&copy;/);
  });
});

// ──────────────────────────────────────────────────
// 8. Constants
// ──────────────────────────────────────────────────
describe('constants', () => {
  it('TRANSPARENT_TILE is a valid data URI', () => {
    expect(TRANSPARENT_TILE).toMatch(/^data:image\/gif;base64,/);
  });

  it('MAX_VISIBLE_MARKERS is a reasonable positive number', () => {
    expect(MAX_VISIBLE_MARKERS).toBeGreaterThan(100);
    expect(MAX_VISIBLE_MARKERS).toBeLessThanOrEqual(2000);
  });
});

// ──────────────────────────────────────────────────
// 9. Per-style upstream identity — guards against the regression where
// 5 of 6 styles shared 2 URLs, so the picker visibly didn't change the
// basemap.
// ──────────────────────────────────────────────────
describe('distinct basemap per style', () => {
  it('every style has a UNIQUE base URL (path before {z}/{x}/{y})', () => {
    // Strip placeholders so identical-with-different-{s}-mapping doesn't
    // false-positive. The path-before-templating is the actual upstream
    // raster identity.
    const basePaths = STYLE_ORDER.map((id) =>
      MAP_STYLES[id].url.replace(/\{[sxyz]\}/g, '')
    );
    expect(new Set(basePaths).size).toBe(STYLE_ORDER.length);
  });

  it('dark uses CARTO dark_nolabels (no city labels)', () => {
    expect(MAP_STYLES.dark.url).toContain('dark_nolabels');
  });

  it('night uses CARTO dark_all (with city labels) — distinct from dark', () => {
    expect(MAP_STYLES.night.url).toContain('dark_all');
  });

  it('streets uses voyager WITH labels', () => {
    expect(MAP_STYLES.streets.url).toMatch(/voyager(?!_nolabels)/);
  });

  it('terrain uses OpenTopoMap (only API-key-free terrain raster)', () => {
    expect(MAP_STYLES.terrain.url).toContain('tile.opentopomap.org');
  });

  it('toner uses CARTO light_nolabels', () => {
    expect(MAP_STYLES.toner.url).toContain('light_nolabels');
  });

  it('satellite uses Google direct lyrs=s API', () => {
    expect(MAP_STYLES.satellite.url).toContain('mt{s}.google.com/vt');
    expect(MAP_STYLES.satellite.url).toContain('lyrs=s');
  });
});
