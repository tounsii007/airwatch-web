'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CONVERSION } from '@/lib/constants';
import { resolveAirline, AIRLINES } from '@/lib/data/airlines';
import { isFresh } from '@/lib/flights/aircraftFreshness';
import type { AircraftState, MapStyle } from '@/lib/types';
import { EMERGENCY_SQUAWKS, squawkColor } from '@/lib/hooks/useSquawkAlerts';
import { MAP_STYLES, MAX_VISIBLE_MARKERS } from '@/components/map/mapStyles';

export function useAircraftMarkers({
  aircraftMap,
  mapRef,
  mapStyle,
  selectedAircraft,
  selectAircraft,
  showLabels,
  zoom,
  cargoOnly = false,
}: {
  aircraftMap: Map<string, AircraftState>;
  mapRef: React.MutableRefObject<L.Map | null>;
  mapStyle: MapStyle;
  selectedAircraft: AircraftState | null;
  selectAircraft: (aircraft: AircraftState) => void;
  showLabels: boolean;
  zoom: number;
  /** When true, hide every flight whose operator's catalogue isCargo flag isn't true. */
  cargoOnly?: boolean;
}) {
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!markersLayerRef.current) {
      markersLayerRef.current = L.layerGroup();
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = map.getBounds();
    const margin = 2;
    const south = bounds.getSouth() - margin;
    const north = bounds.getNorth() + margin;
    const west = bounds.getWest() - margin;
    const east = bounds.getEast() + margin;

    const now = Date.now();
    const visible: AircraftState[] = [];
    aircraftMap.forEach((aircraft) => {
      // Cached/offline flights stay in the store for search lists, but rendering
      // them on the live map would show stale positions — skip them here.
      if (!isFresh(aircraft, now)) return;
      if (aircraft.latitude == null || aircraft.longitude == null) return;
      // Cargo-only filter: keep the aircraft only when the catalogue marks
      // its operator as a cargo carrier. Falls open (keeps the row) when
      // the airlines catalogue hasn't hydrated yet, so the user never sees
      // a momentarily-empty map after toggling the switch.
      if (cargoOnly) {
        const callsignOp = aircraft.callsign ? resolveAirline(aircraft.callsign) : undefined;
        const fallbackOp = aircraft.airlineIcao
          ? AIRLINES[aircraft.airlineIcao.toUpperCase()]
          : undefined;
        const isCargo = (callsignOp ?? fallbackOp)?.isCargo;
        // Strict check: only when isCargo is explicitly true do we render.
        // This deliberately drops uncategorised flights so the filter is
        // honest about what it includes.
        if (isCargo !== true) return;
      }
      if (
        aircraft.latitude >= south &&
        aircraft.latitude <= north &&
        aircraft.longitude >= west &&
        aircraft.longitude <= east
      ) {
        visible.push(aircraft);
      }
    });

    // Grid-based spatial sampling. The previous `index % step` filter
    // dropped every Nth aircraft from the underlying Map — which maps
    // well for a uniform random distribution but skews badly for the
    // real-world data: dense regions (Europe rush hour) keep all their
    // flights while sparse regions (Pacific) lose theirs entirely.
    //
    // Grid sampling: divide the visible bounds into a cell grid sized
    // so the cell count is ~MAX_VISIBLE_MARKERS, then keep one
    // representative aircraft per cell. Result: roughly even density
    // across the visible area regardless of where the planes actually
    // cluster, with a tunable count cap. Selected aircraft is always
    // kept regardless of cell occupancy.
    let toRender = visible;
    if (visible.length > MAX_VISIBLE_MARKERS && zoom < 7) {
      const latSpan = north - south;
      const lonSpan = east - west;
      // Cell side picked so total cells ~= MAX_VISIBLE_MARKERS — square
      // root because we have a 2D grid.
      const cellsPerSide = Math.ceil(Math.sqrt(MAX_VISIBLE_MARKERS));
      const cellLat = latSpan / cellsPerSide;
      const cellLon = lonSpan / cellsPerSide;
      const grid = new Map<string, AircraftState>();
      for (const ac of visible) {
        const gy = Math.floor((ac.latitude! - south) / cellLat);
        const gx = Math.floor((ac.longitude! - west) / cellLon);
        const key = `${gy}:${gx}`;
        // Prefer aircraft with a callsign over those without — gives
        // identifiable representatives when cells overlap multiple flights.
        const existing = grid.get(key);
        if (!existing || (!existing.callsign && ac.callsign)) {
          grid.set(key, ac);
        }
      }
      toRender = Array.from(grid.values());
    }

    if (selectedAircraft && !toRender.some((aircraft) => aircraft.icao24 === selectedAircraft.icao24)) {
      toRender.push(selectedAircraft);
    }

    const usePlaneIcons = zoom >= 6 && toRender.length < 2000;
    const styleColors = MAP_STYLES[mapStyle].colors;
    const styleAltitudeColor = (meters: number | undefined, onGround: boolean): string => {
      if (onGround) return styleColors.ground;
      if (meters == null || meters === 0) return styleColors.med;
      const feet = meters * CONVERSION.metersToFeet;
      if (feet < 100) return styleColors.ground;
      if (feet < 10000) return styleColors.low;
      if (feet < 30000) return styleColors.med;
      return styleColors.high;
    };

    for (const aircraft of toRender) {
      if (aircraft.latitude == null || aircraft.longitude == null) continue;

      const isSelected = selectedAircraft?.icao24 === aircraft.icao24;
      const isEmergency = Boolean(aircraft.squawk && EMERGENCY_SQUAWKS.has(aircraft.squawk));
      const emergencyColor = isEmergency ? squawkColor(aircraft.squawk!) : null;
      const color = isSelected
        ? styleColors.selected
        : (emergencyColor ?? styleAltitudeColor(aircraft.baroAltitude, aircraft.onGround));
      const rotation = aircraft.trueTrack ?? 0;

      let marker: L.CircleMarker | L.Marker;
      if (usePlaneIcons || isSelected || isEmergency) {
        const size = isSelected ? 32 : (zoom >= 10 ? 26 : zoom >= 8 ? 22 : zoom >= 6 ? 18 : 14);
        const glow = isSelected
          ? `filter:drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color});`
          : isEmergency
            ? `filter:drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color});`
            : `filter:drop-shadow(0 0 3px ${color});`;
        const pulseRing = isEmergency
          ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0.7;animation:squawk-pulse 1.2s ease-in-out infinite;"></div>`
          : '';
        marker = L.marker([aircraft.latitude, aircraft.longitude], {
          icon: L.divIcon({
            html: `<div style="position:relative;width:${size}px;height:${size}px;">${pulseRing}<div style="width:${size}px;height:${size}px;transform:rotate(${rotation}deg);${glow}"><svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 2L10 8L3 10L3 12L10 11L10 17L7 19L7 20.5L12 19L17 20.5L17 19L14 17L14 11L21 12L21 10L14 8Z"/></svg></div></div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
        });
      } else {
        marker = L.circleMarker([aircraft.latitude, aircraft.longitude], {
          radius: zoom >= 8 ? 5 : zoom >= 6 ? 4 : 3,
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.85,
          weight: 0,
        });
      }

      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        selectAircraft(aircraft);
      });

      if (isSelected && aircraft.callsign && showLabels) {
        const info = resolveAirline(aircraft.callsign);
        const label = info?.iata && aircraft.callsign.length > 3
          ? `${info.iata}${aircraft.callsign.slice(3)}`
          : aircraft.callsign;
        marker.bindTooltip(
          L.tooltip({
            permanent: true,
            direction: 'top',
            offset: [0, -16],
            className: 'aircraft-tooltip',
          }).setContent(
            `<span style="font-family:var(--font-heading);font-size:10px;font-weight:700;letter-spacing:1px;color:#E0F0FF;background:rgba(15,29,50,0.9);border:1px solid ${color};border-radius:4px;padding:2px 6px;">${label}</span>`
          )
        );
      }

      marker.addTo(layer);
    }
  }, [aircraftMap, mapRef, mapStyle, selectedAircraft, selectAircraft, showLabels, zoom, cargoOnly]);

  return markersLayerRef;
}
