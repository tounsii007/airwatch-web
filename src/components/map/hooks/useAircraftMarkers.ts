'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { resolveAirline } from '@/lib/data/airlines';
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
}: {
  aircraftMap: Map<string, AircraftState>;
  mapRef: React.MutableRefObject<L.Map | null>;
  mapStyle: MapStyle;
  selectedAircraft: AircraftState | null;
  selectAircraft: (aircraft: AircraftState) => void;
  showLabels: boolean;
  zoom: number;
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

    const visible: AircraftState[] = [];
    aircraftMap.forEach((aircraft) => {
      if (aircraft.latitude == null || aircraft.longitude == null) return;
      if (
        aircraft.latitude >= south &&
        aircraft.latitude <= north &&
        aircraft.longitude >= west &&
        aircraft.longitude <= east
      ) {
        visible.push(aircraft);
      }
    });

    let toRender = visible;
    if (visible.length > MAX_VISIBLE_MARKERS && zoom < 7) {
      const step = Math.ceil(visible.length / MAX_VISIBLE_MARKERS);
      toRender = visible.filter((_, index) => index % step === 0);
    }

    if (selectedAircraft && !toRender.some((aircraft) => aircraft.icao24 === selectedAircraft.icao24)) {
      toRender.push(selectedAircraft);
    }

    const usePlaneIcons = zoom >= 6 && toRender.length < 2000;
    const styleColors = MAP_STYLES[mapStyle].colors;
    const styleAltitudeColor = (meters: number | undefined, onGround: boolean): string => {
      if (onGround) return styleColors.ground;
      if (meters == null || meters === 0) return styleColors.med;
      const feet = meters * 3.28084;
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
  }, [aircraftMap, mapRef, mapStyle, selectedAircraft, selectAircraft, showLabels, zoom]);

  return markersLayerRef;
}
