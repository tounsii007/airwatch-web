'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import type { MapStyle } from '@/lib/types';
import { CONFIG } from '@/lib/constants';
import { MAP_STYLES, TRANSPARENT_TILE } from '@/components/map/mapStyles';

export function useBaseLayer({
  baseLayerRef,
  mapRef,
  mapStyle,
}: {
  baseLayerRef: React.MutableRefObject<L.TileLayer | null>;
  mapRef: React.MutableRefObject<L.Map | null>;
  mapStyle: MapStyle;
}) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = MAP_STYLES[mapStyle];

    baseLayerRef.current?.remove();
    baseLayerRef.current = L.tileLayer(style.url, {
      attribution: style.attr,
      maxZoom: CONFIG.maxZoom,
      maxNativeZoom: style.maxNative,
      subdomains: style.subdomains ?? 'abc',
      errorTileUrl: TRANSPARENT_TILE,
    }).addTo(map);
    baseLayerRef.current.bringToBack();

    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter = style.dark
        ? 'invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.3) saturate(0.3)'
        : 'none';
    }
  }, [baseLayerRef, mapRef, mapStyle]);
}
