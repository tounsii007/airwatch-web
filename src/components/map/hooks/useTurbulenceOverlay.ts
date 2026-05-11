'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { API } from '@/lib/constants';
import { apiFetch } from '@/lib/apiFetch';
import { getSeverityColor, parseSigmetResponse, type TurbulenceZone } from '@/lib/turbulence/parseSigmet';

/** Re-fetch SIGMET data every 10 minutes — matches the AWC refresh cadence. */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

async function fetchZones(signal: AbortSignal): Promise<TurbulenceZone[]> {
  try {
    const res = await apiFetch(API.turbulence(), { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return parseSigmetResponse(data);
  } catch {
    return [];
  }
}

function drawZone(layer: L.LayerGroup, zone: TurbulenceZone) {
  const color = getSeverityColor(zone.severity);
  const polygon = L.polygon(zone.polygon, {
    color,
    weight: 1.5,
    fillColor: color,
    fillOpacity: 0.15,
    opacity: 0.7,
  });
  const altRange = zone.altitudeLow != null && zone.altitudeHigh != null
    ? `FL${Math.round(zone.altitudeLow / 100)}–FL${Math.round(zone.altitudeHigh / 100)}`
    : '';
  polygon.bindTooltip(
    `<div class="text-[10px]"><strong>${zone.hazard.toUpperCase()}</strong> ${zone.severity} ${altRange}</div>`,
    { sticky: true, className: 'aircraft-tooltip' },
  );
  polygon.addTo(layer);
}

/**
 * Render AWC SIGMET / AIRMET turbulence polygons as a semi-transparent overlay
 * on the map. Active only when {@code enabled} is true; polygons are cleared
 * the moment it flips off so no stale zones linger.
 */
export function useTurbulenceOverlay({
  enabled,
  mapRef,
}: {
  enabled: boolean;
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [zones, setZones] = useState<TurbulenceZone[]>([]);

  useEffect(() => {
    if (!layerRef.current) layerRef.current = L.layerGroup();
  }, []);

  useEffect(() => {
    if (!enabled) {
       
      setZones([]);
      return;
    }
    const controller = new AbortController();
    // Async fetch — setZones runs after the effect settles, not synchronously.
     
    void fetchZones(controller.signal).then(setZones);
    const timer = setInterval(() => {
       
      void fetchZones(controller.signal).then(setZones);
    }, REFRESH_INTERVAL_MS);
    return () => { controller.abort(); clearInterval(timer); };
  }, [enabled]);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!enabled) return;
    for (const zone of zones) drawZone(layer, zone);
    if (!map.hasLayer(layer)) layer.addTo(map);
  }, [enabled, zones, mapRef]);

  return layerRef;
}
