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

  it('STYLE_ORDER covers every defined style', () => {
    expect(STYLE_ORDER).toHaveLength(allStyles.length);
    for (const key of allStyles) {
      expect(STYLE_ORDER).toContain(key);
    }
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
  it('is same-origin via the nginx tile proxy', () => {
    // Tile URLs were migrated to same-origin paths so the browser's
    // Network tab never reveals the upstream provider. See
    // airwatch/nginx/nginx.conf for the proxy + cache config.
    expect(style.url).toMatch(/^\/tiles\//);
  });

  it('includes {z}, {x}, {y} placeholders', () => {
    expect(style.url).toContain('{z}');
    expect(style.url).toContain('{x}');
    expect(style.url).toContain('{y}');
  });

  it('ends with .png OR is a clean RESTful tile path', () => {
    // Most tile URLs end in .png. The Google-satellite endpoint stays
    // extension-less because nginx rewrites it to Google's
    // ?lyrs=s&x={x}&y={y}&z={z} query-param API on the upstream side.
    expect(style.url).toMatch(/\.png$|\/google\/sat\/\{z\}\/\{x\}\/\{y\}$/);
  });

  it('does not use the legacy {s} subdomain placeholder', () => {
    // Same-origin URLs don't need the {s} round-robin trick — HTTP/2
    // makes the per-host concurrency cap irrelevant.
    expect(style.url).not.toContain('{s}');
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
// 9. No-labels tile URLs
// ──────────────────────────────────────────────────
describe('no-labels tiles', () => {
  it('dark and night use CARTO nolabels', () => {
    expect(MAP_STYLES.dark.url).toContain('nolabels');
    expect(MAP_STYLES.night.url).toContain('nolabels');
  });

  it('toner uses CARTO light nolabels', () => {
    expect(MAP_STYLES.toner.url).toContain('nolabels');
  });

  it('streets uses voyager nolabels', () => {
    expect(MAP_STYLES.streets.url).toContain('nolabels');
  });

  it('satellite uses Google sat tiles via the proxy', () => {
    // Underlying upstream is Google's `lyrs=s` API; nginx rewrites the
    // clean RESTful path to Google's query-param form. From the
    // frontend's perspective we only assert the proxy path.
    expect(MAP_STYLES.satellite.url).toContain('/tiles/google/sat/');
  });
});
