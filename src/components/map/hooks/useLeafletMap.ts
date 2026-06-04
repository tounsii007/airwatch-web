'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CONFIG } from '@/lib/constants';
import { MAP_STYLES, TRANSPARENT_TILE } from '@/components/map/mapStyles';

/**
 * Leaflet bootstrap with the defensive lifecycle a real-world embedded map
 * needs. Each option below corrects a specific real-world bug we hit:
 *
 *   * `invalidateSize()` via ResizeObserver — Leaflet measures the container
 *     once at init. If the parent's flexbox / dvh hasn't settled (very
 *     common on first paint or during route transitions), the cached size
 *     is wrong and the tile-pane only fills part of the viewport. Symptom:
 *     map renders in lower half of the screen, top half empty grey. Fix:
 *     watch the container with ResizeObserver and re-invalidate on every
 *     change. Also re-invalidate on window resize for browsers that don't
 *     fire RO on viewport changes.
 *
 *   * `maxBounds` + `maxBoundsViscosity` — without these the user can pan
 *     into infinite empty mercator space, get lost, never find their way
 *     back. Restrict to a single world, with elastic bounce-back at the
 *     edges (viscosity 1.0 = hard wall, 0.0 = no resistance).
 *
 *   * `worldCopyJump` — when the user pans across the dateline, Leaflet
 *     teleports the view so markers don't disappear off the right edge
 *     and reappear on the left. Without this, flights crossing the
 *     Pacific look like they vanish.
 *
 *   * `wheelDebounceTime` — default is 40 ms which produces jittery zoom
 *     on high-DPI mice. 100 ms is smoother without feeling laggy.
 *
 *   * `fadeAnimation: false` — kills the brief opacity ramp when style
 *     changes; combined with our layer-cache pattern in useBaseLayer
 *     this makes style toggling feel instant.
 *
 *   * `preferCanvas: true` — already there but worth re-stating: SVG
 *     fallback chokes at >300 markers, canvas does 5000+ at 60 fps.
 */
export function useLeafletMap(onMapClick: () => void) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const [zoom, setZoom] = useState(CONFIG.defaultZoom);

  useEffect(() => {
    const containerEl = mapContainerRef.current;
    if (!containerEl || mapRef.current) return;

    const map = L.map(containerEl, {
      center: [CONFIG.defaultLat, CONFIG.defaultLon],
      zoom: CONFIG.defaultZoom,
      minZoom: CONFIG.minZoom,
      maxZoom: CONFIG.maxZoom,
      zoomControl: false,
      preferCanvas: true,
      renderer: L.canvas(),
      // ── Pan + dateline behaviour ─────────────────────────────────────
      worldCopyJump: true,
      maxBounds: L.latLngBounds([-90, -220], [90, 220]),
      maxBoundsViscosity: 0.7,
      // ── Wheel + animation tuning ─────────────────────────────────────
      wheelDebounceTime: 100,
      wheelPxPerZoomLevel: 80,
      fadeAnimation: false,
      zoomAnimation: true,
      markerZoomAnimation: false, // we re-render markers ourselves
      // ── Inertia: keep the natural feel but cap the top speed so a
      //    fast trackpad swipe doesn't fling the user across the world.
      inertiaMaxSpeed: 1500,
    });

    const initialStyle = MAP_STYLES.satellite;
    baseLayerRef.current = L.tileLayer(initialStyle.url, {
      attribution: initialStyle.attr,
      maxZoom: CONFIG.maxZoom,
      maxNativeZoom: initialStyle.maxNative,
      subdomains: initialStyle.subdomains ?? 'abc',
      errorTileUrl: TRANSPARENT_TILE,
      // Buffer beyond viewport so panning doesn't show grey gaps.
      keepBuffer: 4,
      updateWhenIdle: false,
      updateWhenZooming: false,
    }).addTo(map);

    map.on('zoomend', () => setZoom(map.getZoom()));
    map.on('click', onMapClick);
    mapRef.current = map;

    // ── Defensive size invalidation ──────────────────────────────────
    // Run once on next animation frame to catch the case where Leaflet
    // measured the container before flexbox/grid layout had finalised.
    const rafId = requestAnimationFrame(() => map.invalidateSize());

    // ResizeObserver re-fires invalidateSize on any container size
    // change — whether from window resize, sidebar collapse, devtools
    // open, or CSS media-query crossings. Throttled via rAF so a
    // continuous resize drag doesn't run invalidateSize 60×/sec.
    let pendingFrame = 0;
    const ro = new ResizeObserver(() => {
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = 0;
        map.invalidateSize({ animate: false });
      });
    });
    ro.observe(containerEl);

    // Window resize is redundant with RO in modern browsers but the
    // spec lets RO skip the parent-size-only changes some legacy IE
    // emulators still produce. Cheap belt-and-braces.
    const onWinResize = () => map.invalidateSize({ animate: false });
    window.addEventListener('resize', onWinResize);

    return () => {
      cancelAnimationFrame(rafId);
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
      map.off('zoomend');
      map.off('click', onMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  return { baseLayerRef, mapContainerRef, mapRef, zoom };
}
