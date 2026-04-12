'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { AircraftState } from '@/lib/types';
import { getAltitudeColor } from '@/lib/utils';
import { airportCoords } from '@/lib/data/airports';
import { generateArc } from '@/components/map/generateArc';

export function useRouteOverlay({
  selectedAircraft,
  showTrails,
}: {
  selectedAircraft: AircraftState | null;
  showTrails: boolean;
}) {
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!routeLayerRef.current) {
      routeLayerRef.current = L.layerGroup();
    }
  }, []);

  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;
    routeLayer.clearLayers();

    if (!showTrails || !selectedAircraft) return;
    const depIata = selectedAircraft.depIata;
    const arrIata = selectedAircraft.arrIata;
    if (!depIata || !arrIata) return;

    const depCoords = airportCoords(depIata);
    const arrCoords = airportCoords(arrIata);
    if (!depCoords || !arrCoords) return;

    const acLat = selectedAircraft.latitude;
    const acLon = selectedAircraft.longitude;
    if (acLat == null || acLon == null) return;

    const rawColor = getAltitudeColor(selectedAircraft.baroAltitude, selectedAircraft.onGround);
    const routeColor = rawColor === '#6B7280' ? '#7A9ABF' : rawColor;
    const heading = selectedAircraft.trueTrack;
    const completedArc = generateArc(depCoords.lat, depCoords.lon, acLat, acLon, 30, heading);
    const remainingArc = generateArc(acLat, acLon, arrCoords.lat, arrCoords.lon, 30, heading);

    L.polyline(completedArc, { color: routeColor, weight: 6, opacity: 0.12, lineCap: 'round' }).addTo(routeLayer);
    L.polyline(remainingArc, { color: routeColor, weight: 6, opacity: 0.08, lineCap: 'round' }).addTo(routeLayer);
    L.polyline(completedArc, { color: routeColor, weight: 2.5, opacity: 0.8, lineCap: 'round' }).addTo(routeLayer);
    L.polyline(remainingArc, { color: routeColor, weight: 2, opacity: 0.35, dashArray: '6 8', lineCap: 'round' }).addTo(routeLayer);
    L.circleMarker([depCoords.lat, depCoords.lon], { radius: 8, color: routeColor, fillColor: routeColor, fillOpacity: 0.15, weight: 2 }).addTo(routeLayer);
    L.circleMarker([depCoords.lat, depCoords.lon], { radius: 4, color: routeColor, fillColor: routeColor, fillOpacity: 0.9, weight: 0 })
      .bindTooltip(depIata, { permanent: true, direction: 'bottom', className: 'aircraft-tooltip', offset: [0, 8] })
      .addTo(routeLayer);
    L.circleMarker([arrCoords.lat, arrCoords.lon], { radius: 8, color: routeColor, fillColor: routeColor, fillOpacity: 0.1, weight: 2 }).addTo(routeLayer);
    L.circleMarker([arrCoords.lat, arrCoords.lon], { radius: 4, color: routeColor, fillColor: routeColor, fillOpacity: 0.7, weight: 0 })
      .bindTooltip(arrIata, { permanent: true, direction: 'bottom', className: 'aircraft-tooltip', offset: [0, 8] })
      .addTo(routeLayer);
  }, [selectedAircraft, showTrails]);

  return routeLayerRef;
}
