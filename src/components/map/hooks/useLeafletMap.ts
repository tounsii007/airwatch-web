'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CONFIG } from '@/lib/constants';
import { MAP_STYLES, TRANSPARENT_TILE } from '@/components/map/mapStyles';

export function useLeafletMap(onMapClick: () => void) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const [zoom, setZoom] = useState(CONFIG.defaultZoom);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [CONFIG.defaultLat, CONFIG.defaultLon],
      zoom: CONFIG.defaultZoom,
      minZoom: CONFIG.minZoom,
      maxZoom: CONFIG.maxZoom,
      zoomControl: false,
      preferCanvas: true,
      renderer: L.canvas(),
    });

    const initialStyle = MAP_STYLES.dark;
    baseLayerRef.current = L.tileLayer(initialStyle.url, {
      attribution: initialStyle.attr,
      maxZoom: CONFIG.maxZoom,
      maxNativeZoom: initialStyle.maxNative,
      subdomains: initialStyle.subdomains ?? 'abc',
      errorTileUrl: TRANSPARENT_TILE,
    }).addTo(map);

    map.on('zoomend', () => setZoom(map.getZoom()));
    map.on('click', onMapClick);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  return { baseLayerRef, mapContainerRef, mapRef, zoom };
}
