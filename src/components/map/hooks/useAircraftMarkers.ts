'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CONVERSION } from '@/lib/constants';
import { resolveAirline, AIRLINES } from '@/lib/data/airlines';
import { isFresh } from '@/lib/flights/aircraftFreshness';
import type { AircraftState, MapStyle } from '@/lib/types';
import { EMERGENCY_SQUAWKS, squawkColor } from '@/lib/hooks/useSquawkAlerts';
import { MAP_STYLES } from '@/components/map/mapStyles';
import {
  buildMarkerIconHtml,
  buildSelectedTooltipHtml,
  gridSampleAircraft,
} from '@/components/map/hooks/aircraftMarkerHelpers';

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
    // dropped every Nth aircraft from the underlying Map — which skewed
    // badly toward dense regions (Europe) at the expense of sparse ones
    // (Pacific). Helper now lives in aircraftMarkerHelpers so the hook
    // body stays readable.
    const toRender = gridSampleAircraft(visible, { south, north, west, east, zoom });

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
        marker = L.marker([aircraft.latitude, aircraft.longitude], {
          icon: L.divIcon({
            html: buildMarkerIconHtml({ size, rotation, color, isSelected, isEmergency }),
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
            offset: [0, -18],
            className: 'aircraft-tooltip',
          }).setContent(
            buildSelectedTooltipHtml({
              label,
              color,
              baroAltitudeMeters: aircraft.baroAltitude,
              onGround: Boolean(aircraft.onGround),
            }),
          )
        );
      }

      marker.addTo(layer);
    }
  }, [aircraftMap, mapRef, mapStyle, selectedAircraft, selectAircraft, showLabels, zoom, cargoOnly]);

  return markersLayerRef;
}
