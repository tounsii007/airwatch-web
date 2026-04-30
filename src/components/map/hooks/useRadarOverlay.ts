'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CONFIG } from '@/lib/constants';
import { TRANSPARENT_TILE } from '@/components/map/mapStyles';

/**
 * Weather-radar overlay (RainViewer tiles, proxied through nginx).
 *
 * Lives in its OWN pane (`radar-pane`) instead of the default tilePane.
 * Why: the basemap's CSS filter (invert + hue-rotate for dark styles)
 * applies to every layer in tilePane — without a separate pane the
 * radar tiles would be hue-rotated to nonsense colors. A dedicated pane
 * z-stacked just above tilePane is filter-free and keeps the original
 * blue/yellow rain colors readable.
 *
 * z-index 400 sits above tilePane (200) and below overlayPane (400) +
 * markerPane (600) so flight icons stay on top of the rain.
 */
export function useRadarOverlay({
  enabled,
  mapRef,
  tileUrl,
}: {
  enabled: boolean;
  mapRef: React.MutableRefObject<L.Map | null>;
  tileUrl: string | null;
}) {
  const radarLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Create the radar pane once. Idempotent — Leaflet returns the
    // existing pane on subsequent calls with the same name.
    if (!map.getPane('radar-pane')) {
      const pane = map.createPane('radar-pane');
      pane.style.zIndex = '350';
      // Explicitly set `filter: none` so even if a parent stylesheet
      // tries to inherit the basemap's filter, our pane stays clean.
      pane.style.filter = 'none';
      // Don't intercept clicks — the radar is decorative, not interactive.
      pane.style.pointerEvents = 'none';
    }

    radarLayerRef.current?.remove();
    radarLayerRef.current = null;

    if (enabled && tileUrl) {
      radarLayerRef.current = L.tileLayer(tileUrl, {
        pane: 'radar-pane',
        opacity: 0.45,
        maxNativeZoom: 6,
        maxZoom: CONFIG.maxZoom,
        errorTileUrl: TRANSPARENT_TILE,
        // Cleaner cross-fade when the radar timestamp updates every 10 min.
        updateWhenIdle: true,
        keepBuffer: 2,
      }).addTo(map);
    }
  }, [enabled, mapRef, tileUrl]);

  // Cleanup when MapView unmounts so we don't leak the layer to the next
  // page mount.
  useEffect(() => {
    const ref = radarLayerRef;
    return () => {
      ref.current?.remove();
      ref.current = null;
    };
  }, []);
}
