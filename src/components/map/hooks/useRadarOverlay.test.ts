// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createRef } from 'react';
import type L from 'leaflet';

/**
 * Guards the "aircraft invisible under radar" bug fix.
 *
 * The radar overlay lives in its own pane so the basemap's dark-mode CSS
 * filter can't recolour the rain tiles. That pane MUST be z-stacked at 250 —
 * above tilePane (200) but below overlayPane (400) and markerPane (600). The
 * regression set it to 350, which floated the radar above the flight markers
 * and hid every aircraft behind the (semi-transparent) rain. These tests pin
 * the pane's zIndex to the fix value '250' (explicitly NOT '350'), assert it's
 * non-interactive + filter-free, and confirm the tile layer is only added when
 * the overlay is both enabled and has a tile URL.
 *
 * Follows the headless Leaflet-mock + renderHook pattern from
 * `useHeatmapLayer.test.ts` — happy-dom lacks Leaflet's real DOM/canvas
 * surface, so `leaflet` is replaced wholesale with a recording stub. The pane
 * is a real DOM element so `pane.style.*` writes behave like the browser.
 */

// Records every tile URL handed to L.tileLayer, plus the maps it was added to.
const tileLayerCalls: Array<{ url: string; addedTo: unknown }> = [];

vi.mock('leaflet', () => {
  const tileLayer = vi.fn((url: string) => {
    const layer: Record<string, unknown> = {
      addTo(map: unknown) {
        tileLayerCalls.push({ url, addedTo: map });
        return this;
      },
      remove: vi.fn(),
    };
    return layer;
  });

  return {
    default: { tileLayer },
    tileLayer,
  };
});

// A map stub that owns real DOM panes so `.style` reads/writes work, and an
// idempotent createPane/getPane pair mirroring Leaflet's real contract.
function fakeMap() {
  const panes = new Map<string, HTMLElement>();
  return {
    panes,
    getPane: vi.fn((name: string) => panes.get(name)),
    createPane: vi.fn((name: string) => {
      const el = document.createElement('div');
      panes.set(name, el);
      return el;
    }),
  };
}

type FakeMap = ReturnType<typeof fakeMap>;

// Imported after vi.mock so the stub is in place. The hook also imports CONFIG
// and TRANSPARENT_TILE from real (un-mocked) modules — left intact on purpose.
import { useRadarOverlay } from './useRadarOverlay';

function mapRefOf(map: FakeMap | null) {
  const ref = createRef<L.Map | null>() as React.MutableRefObject<L.Map | null>;
  ref.current = map as unknown as L.Map | null;
  return ref;
}

describe('useRadarOverlay', () => {
  beforeEach(() => {
    tileLayerCalls.length = 0;
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('radar pane (the "aircraft invisible under radar" fix)', () => {
    it("creates the radar pane at zIndex '250' — the fix value, explicitly NOT '350'", () => {
      const map = fakeMap();
      renderHook(() =>
        useRadarOverlay({ enabled: true, mapRef: mapRefOf(map), tileUrl: 'https://example.com/{z}/{x}/{y}.png' }),
      );

      expect(map.createPane).toHaveBeenCalledWith('radar-pane');
      const pane = map.panes.get('radar-pane');
      expect(pane).toBeDefined();
      // The regression that hid aircraft set this to 350 (above markerPane 600?
      // no — above overlayPane/markerPane stacking). 250 keeps radar between
      // tilePane (200) and overlayPane (400) so markers stay on top.
      expect(pane!.style.zIndex).toBe('250');
      expect(pane!.style.zIndex).not.toBe('350');
    });

    it('makes the radar pane non-interactive (pointerEvents none)', () => {
      const map = fakeMap();
      renderHook(() =>
        useRadarOverlay({ enabled: true, mapRef: mapRefOf(map), tileUrl: 'https://example.com/{z}/{x}/{y}.png' }),
      );

      const pane = map.panes.get('radar-pane');
      expect(pane!.style.pointerEvents).toBe('none');
    });

    it('keeps the radar pane filter-free (filter none) so dark-mode invert never recolours the rain', () => {
      const map = fakeMap();
      renderHook(() =>
        useRadarOverlay({ enabled: true, mapRef: mapRefOf(map), tileUrl: 'https://example.com/{z}/{x}/{y}.png' }),
      );

      const pane = map.panes.get('radar-pane');
      expect(pane!.style.filter).toBe('none');
    });

    it('still creates the pane (with all fix attributes) even when no tiles are added', () => {
      // The pane is created up-front, independent of enabled/tileUrl, so its
      // z-stacking is correct the moment the overlay first turns on.
      const map = fakeMap();
      renderHook(() => useRadarOverlay({ enabled: false, mapRef: mapRefOf(map), tileUrl: null }));

      const pane = map.panes.get('radar-pane');
      expect(pane).toBeDefined();
      expect(pane!.style.zIndex).toBe('250');
      expect(pane!.style.pointerEvents).toBe('none');
      expect(pane!.style.filter).toBe('none');
    });
  });

  describe('radar layer is only added when enabled && tileUrl', () => {
    const URL = 'https://example.com/{z}/{x}/{y}.png';

    it('adds the radar tile layer when enabled AND a tile URL exists', () => {
      const map = fakeMap();
      renderHook(() => useRadarOverlay({ enabled: true, mapRef: mapRefOf(map), tileUrl: URL }));

      expect(tileLayerCalls).toHaveLength(1);
      expect(tileLayerCalls[0].url).toBe(URL);
      expect(tileLayerCalls[0].addedTo).toBe(map);
    });

    it('does NOT add a layer when enabled but tileUrl is null (API not loaded yet)', () => {
      const map = fakeMap();
      renderHook(() => useRadarOverlay({ enabled: true, mapRef: mapRefOf(map), tileUrl: null }));

      expect(tileLayerCalls).toHaveLength(0);
    });

    it('does NOT add a layer when a tileUrl exists but the overlay is disabled', () => {
      const map = fakeMap();
      renderHook(() => useRadarOverlay({ enabled: false, mapRef: mapRefOf(map), tileUrl: URL }));

      expect(tileLayerCalls).toHaveLength(0);
    });

    it('does NOT add a layer when both disabled and tileUrl null', () => {
      const map = fakeMap();
      renderHook(() => useRadarOverlay({ enabled: false, mapRef: mapRefOf(map), tileUrl: null }));

      expect(tileLayerCalls).toHaveLength(0);
    });

    it('does nothing (no pane, no layer) when the map is not yet mounted', () => {
      renderHook(() => useRadarOverlay({ enabled: true, mapRef: mapRefOf(null), tileUrl: URL }));

      expect(tileLayerCalls).toHaveLength(0);
    });
  });
});
