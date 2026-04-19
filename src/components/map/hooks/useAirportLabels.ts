'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MapStyle } from '@/lib/types';
import { AIRPORTS } from '@/lib/data/airports';

/**
 * Major international hubs — shown at zoom >= 4.
 * ~75 airports worldwide.
 */
const MAJOR_AIRPORTS = new Set([
  // Europe
  'LHR', 'CDG', 'FRA', 'AMS', 'IST', 'MAD', 'BCN', 'FCO', 'MUC', 'ZRH',
  'VIE', 'CPH', 'OSL', 'ARN', 'HEL', 'WAW', 'PRG', 'BRU', 'DUB', 'ATH',
  'LIS', 'MXP', 'BER',
  // Middle East
  'DXB', 'DOH', 'AUH', 'JED', 'TLV', 'CAI',
  // Asia
  'HND', 'NRT', 'PEK', 'PVG', 'HKG', 'SIN', 'ICN', 'BKK', 'KUL', 'DEL',
  'BOM', 'CGK', 'TPE', 'CAN',
  // Americas
  'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'DEN', 'SFO', 'MIA', 'YYZ', 'MEX',
  'GRU', 'SCL', 'BOG', 'EZE',
  // Africa
  'JNB', 'CPT', 'NBO', 'CMN', 'ADD',
  // Oceania
  'SYD', 'MEL', 'AKL',
]);

/**
 * Secondary airports — shown at zoom >= 7.
 * Regional hubs, ~100 airports.
 */
const SECONDARY_AIRPORTS = new Set([
  // Europe
  'LGW', 'ORY', 'DUS', 'HAM', 'STR', 'CGN', 'NUE', 'HAJ', 'LEJ',
  'NCE', 'LYS', 'MRS', 'TLS', 'BOD',
  'BGY', 'NAP', 'VCE', 'BLQ',
  'GVA', 'BSL', 'PMI', 'AGP', 'IBZ', 'TFS', 'LPA',
  'EDI', 'MAN', 'BHX',
  'OPO', 'FAO', 'SKG', 'SOF', 'OTP', 'BUD', 'KRK', 'BEG', 'ZAG',
  'SAW', 'AYT', 'ADB', 'ESB',
  'RIX', 'VNO', 'TLL',
  // Middle East / Africa
  'RUH', 'AMM', 'KWI', 'BAH', 'MCT',
  'ALG', 'TUN', 'RAK', 'HRG', 'LOS', 'ACC', 'DAR',
  // Asia
  'KIX', 'SHA', 'SZX', 'CTU', 'HAN', 'SGN', 'DPS', 'MNL',
  'BLR', 'MAA', 'HYD', 'CCU', 'CMB', 'ISB',
  // Americas
  'EWR', 'IAH', 'SEA', 'BOS', 'CLT', 'MSP', 'DTW', 'MCO', 'LAS', 'PHX',
  'YUL', 'YVR', 'YYC', 'CUN', 'LIM', 'PTY', 'GIG',
  // Oceania
  'BNE', 'PER',
]);

interface AirportEntry {
  iata: string;
  lat: number;
  lon: number;
  minZoom: number;
}

/** Pre-built array of airports with their minimum zoom levels */
let _airportCache: AirportEntry[] | null = null;

function getAirportEntries(): AirportEntry[] {
  if (_airportCache) return _airportCache;
  const entries: AirportEntry[] = [];
  for (const [iata, data] of Object.entries(AIRPORTS) as [string, { la: number; lo: number }][]) {
    let minZoom: number;
    if (MAJOR_AIRPORTS.has(iata)) minZoom = 4;
    else if (SECONDARY_AIRPORTS.has(iata)) minZoom = 7;
    else minZoom = 11; // Small airports only at high zoom
    entries.push({ iata, lat: data.la, lon: data.lo, minZoom });
  }
  _airportCache = entries;
  return entries;
}

export function useAirportLabels({
  mapRef,
  mapStyle,
  zoom,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  mapStyle: MapStyle;
  zoom: number;
}) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!map.hasLayer(layer)) layer.addTo(map);

    if (zoom < 4) return;

    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    const isDark = mapStyle === 'dark' || mapStyle === 'night';
    const labelColor = isDark ? '#94B8C8' : '#0F172A';
    const dotColor = isDark ? '#5A7B9A' : '#334155';
    const textShadow = isDark ? '0 0 4px rgba(0,0,0,0.9)' : '0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.6)';

    // Cap labels to prevent clutter
    const maxLabels = zoom < 7 ? 60 : zoom < 9 ? 120 : 200;
    let count = 0;

    for (const apt of getAirportEntries()) {
      if (count >= maxLabels) break;
      if (zoom < apt.minZoom) continue;
      if (apt.lat < south || apt.lat > north || apt.lon < west || apt.lon > east) continue;

      count++;

      const dot = L.circleMarker([apt.lat, apt.lon], {
        radius: zoom >= 9 ? 3 : 2,
        color: 'transparent',
        fillColor: dotColor,
        fillOpacity: 0.5,
        weight: 0,
        interactive: false,
      });

      const fontSize = zoom >= 9 ? 10 : zoom >= 7 ? 9 : 8;
      dot.bindTooltip(
        L.tooltip({
          permanent: true,
          direction: 'right',
          offset: [5, 0],
          className: 'airport-label',
        }).setContent(
          `<span style="font-family:var(--font-heading);font-size:${fontSize}px;font-weight:700;letter-spacing:0.8px;color:${labelColor};text-shadow:${textShadow};pointer-events:none;">${apt.iata}</span>`
        )
      );
      dot.addTo(layer);
    }
  }, [mapRef, mapStyle, zoom]);

  return layerRef;
}
