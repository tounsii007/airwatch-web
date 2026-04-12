'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CONFIG } from '@/lib/constants';
import { TRANSPARENT_TILE } from '@/components/map/mapStyles';

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
    radarLayerRef.current?.remove();
    radarLayerRef.current = null;

    if (enabled && tileUrl) {
      radarLayerRef.current = L.tileLayer(tileUrl, {
        opacity: 0.45,
        zIndex: 400,
        maxNativeZoom: 6,
        maxZoom: CONFIG.maxZoom,
        errorTileUrl: TRANSPARENT_TILE,
      }).addTo(map);
    }
  }, [enabled, mapRef, tileUrl]);
}
