'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MapStyle } from '@/lib/types';
import { CONFIG } from '@/lib/constants';
import { MAP_STYLES, TRANSPARENT_TILE } from '@/components/map/mapStyles';

/**
 * Layer-cache pattern: keep one TileLayer per style alive in memory and
 * toggle which is attached to the map, instead of remove+recreate on every
 * style switch.
 *
 * Why this matters:
 *   * Recreating a TileLayer wipes its internal pyramid + DOM cache.
 *     The next paint re-fetches every visible tile from the network.
 *     With our same-origin nginx tile proxy + 7-day disk cache the
 *     fetch is fast, but browser-side decode still flashes for ~50 ms.
 *   * Two styles can SHARE a URL but differ in marker palette / tile-pane
 *     filter (dark vs night, streets vs terrain). The cache is keyed by
 *     URL, so those styles share a single set of tile fetches — only
 *     the CSS filter on `tilePane` and the marker colors flip.
 *
 * ── Bug fixed in this revision ─────────────────────────────────────────
 * Earlier the "previous layer detach" check compared by attribution
 * STRING instead of layer IDENTITY:
 *
 *     if (previous && previous.options.attribution !== style.attr)
 *
 * Two styles can have identical attribution (`streets` and `terrain`
 * both use '&copy; CARTO &copy; OSM' but DIFFERENT URLs). The check
 * decided "same attribution → keep both attached", which left two
 * TileLayers stacked, producing a half-rendered look where the right
 * half showed the new style and the left still showed the old. The new
 * comparison uses object identity (`previous !== layer`) — guaranteed
 * to detach when the active layer actually changes.
 *
 * The filter on the tile pane is also reset unconditionally on every
 * style change — without that a transition from a `dark: true` style
 * back to a `dark: false` one would leave the inverted-hue filter in
 * place and over-darken the new tiles.
 */
export function useBaseLayer({
  baseLayerRef,
  mapRef,
  mapStyle,
}: {
  baseLayerRef: React.MutableRefObject<L.TileLayer | null>;
  mapRef: React.MutableRefObject<L.Map | null>;
  mapStyle: MapStyle;
}) {
  // Map<tile-url, TileLayer>. Persists across re-renders without
  // triggering them — refs are intentional here, not state.
  const layerCacheRef = useRef<Map<string, L.TileLayer>>(new Map());

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = MAP_STYLES[mapStyle];
    const cache = layerCacheRef.current;

    // Get-or-create the cached layer for this style's URL FIRST, so the
    // identity comparison below has a definitive answer.
    let layer = cache.get(style.url);
    if (!layer) {
      layer = L.tileLayer(style.url, {
        attribution: style.attr,
        maxZoom: CONFIG.maxZoom,
        maxNativeZoom: style.maxNative,
        subdomains: style.subdomains ?? 'abc',
        errorTileUrl: TRANSPARENT_TILE,
        // Generous keepBuffer means tiles around the visible viewport
        // stay loaded across small pans — fewer network round-trips.
        keepBuffer: 4,
        // Hint to Leaflet: don't drop tiles aggressively when zooming.
        updateWhenZooming: false,
      });
      cache.set(style.url, layer);
    }

    // Detach EVERY other cached layer except the one we're about to use.
    // Identity comparison (not attribution!) — two styles with the same
    // attribution but different URLs would otherwise leave both attached
    // and produce a half-rendered map.
    cache.forEach((other) => {
      if (other !== layer && map.hasLayer(other)) {
        map.removeLayer(other);
      }
    });

    if (!map.hasLayer(layer)) {
      layer.addTo(map);
    }
    layer.bringToBack();
    baseLayerRef.current = layer;

    // Reset the tile-pane filter ON EVERY change. Otherwise switching
    // away from a filtered style leaves the previous tone active under the
    // new tiles, doubling it up.
    //
    // Precedence:
    //   1. An explicit `style.tileFilter` wins — used by PHOTOGRAPHIC dark
    //      basemaps (satellite) that need a dim + cool-cast TONE rather
    //      than the invert recipe (inverting a photo yields a negative).
    //   2. Otherwise a `dark: true` vector style gets the legacy invert+
    //      hue-rotate that turns LIGHT tiles dark.
    //   3. Everything else: no filter.
    //
    // Scoped to `tilePane` only — the route-glow vectors (overlayPane) and
    // aircraft markers (markerPane) live in sibling panes, and `filter`
    // does not inherit, so they are never dimmed by this.
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter =
        style.tileFilter ??
        (style.dark
          ? 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.3) saturate(0.3)'
          : 'none');
    }

    // Force a redraw — `bringToBack()` reorders internally but doesn't
    // always trigger a paint when the previous layer was just detached
    // mid-transition. `_resetView` re-runs the tile pyramid from the
    // current center+zoom, which matches the new layer's state.
    // Cast through unknown because `_resetView` is private API.
    (layer as unknown as { _resetView: (c: L.LatLng, z: number, n: boolean) => void })
      ._resetView(map.getCenter(), map.getZoom(), true);
  }, [baseLayerRef, mapRef, mapStyle]);

  // On unmount, drop every cached layer so we don't leak tile-DOM nodes
  // when the MapView itself goes away (route change to /stats etc.).
  useEffect(() => {
    const cacheRef = layerCacheRef;
    return () => {
      cacheRef.current.forEach((layer) => layer.remove());
      cacheRef.current.clear();
    };
  }, []);
}
