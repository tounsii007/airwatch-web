'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { AircraftState } from '@/lib/types';
import { getAltitudeColor, haversineDistance } from '@/lib/utils';
import { airportCoords } from '@/lib/data/airports';
import { generateArc } from '@/components/map/generateArc';

/** Under this distance the remaining-arc would be microscopic and visually noisy. */
const FINAL_APPROACH_KM = 5;

/** Pick a point count that matches the arc length — avoids 30-point dense arcs on tiny remainders. */
function pointsFor(distanceKm: number): number {
  if (distanceKm < 50) return 3;
  if (distanceKm < 300) return 10;
  return 30;
}

/** Fade the dashed line as the plane approaches so it never looks like an extended flight path. */
function remainingOpacity(distanceKm: number): number {
  if (distanceKm < 30) return 0.08;
  if (distanceKm < 100) return 0.18;
  return 0.3;
}

function bluishForGround(hex: string): string {
  return hex === '#6B7280' ? '#7A9ABF' : hex;
}

interface Endpoints {
  depLat: number; depLon: number;
  arrLat: number; arrLon: number;
  acLat: number; acLon: number;
  heading?: number;
}

function resolveEndpoints(ac: AircraftState): Endpoints | null {
  if (!ac.depIata || !ac.arrIata) return null;
  if (ac.latitude == null || ac.longitude == null) return null;
  const dep = airportCoords(ac.depIata);
  const arr = airportCoords(ac.arrIata);
  if (!dep || !arr) return null;
  return { depLat: dep.lat, depLon: dep.lon, arrLat: arr.lat, arrLon: arr.lon, acLat: ac.latitude, acLon: ac.longitude, heading: ac.trueTrack };
}

function drawAirportDot(layer: L.LayerGroup, lat: number, lon: number, color: string, label: string) {
  // Outer cyan halo — the `airport-glow` class supplies the drop-shadow bloom
  // so endpoints visually match the lit route arc.
  L.circleMarker([lat, lon], { radius: 11, color: GLOW_CYAN, fillColor: GLOW_CYAN, fillOpacity: 0.1, weight: 0, className: 'airport-glow' }).addTo(layer);
  L.circleMarker([lat, lon], { radius: 8, color, fillColor: color, fillOpacity: 0.12, weight: 2 }).addTo(layer);
  L.circleMarker([lat, lon], { radius: 4, color, fillColor: color, fillOpacity: 0.85, weight: 0 })
    .bindTooltip(label, { permanent: true, direction: 'bottom', className: 'aircraft-tooltip', offset: [0, 8] })
    .addTo(layer);
}

/** Cyan glow accent for the flown segment — the {@link GLOW_CYAN} hue is the
 *  same #00D4FF used by the high-altitude palette, so the selected route reads
 *  as "lit up" regardless of the aircraft's current altitude colour. */
const GLOW_CYAN = '#00D4FF';

function drawCompleted(layer: L.LayerGroup, arc: [number, number][]) {
  // 3-layer cyan glow: a wide faint halo, a mid bloom, and a bright core.
  // `glow-route` adds the CSS drop-shadow so the line appears to emit light.
  L.polyline(arc, { color: GLOW_CYAN, weight: 10, opacity: 0.14, lineCap: 'round', className: 'glow-route' }).addTo(layer);
  L.polyline(arc, { color: GLOW_CYAN, weight: 5, opacity: 0.35, lineCap: 'round', className: 'glow-route' }).addTo(layer);
  L.polyline(arc, { color: GLOW_CYAN, weight: 2.5, opacity: 0.95, lineCap: 'round', className: 'glow-route' }).addTo(layer);
}

function drawRemaining(layer: L.LayerGroup, arc: [number, number][], color: string, opacity: number) {
  L.polyline(arc, { color, weight: 6, opacity: opacity * 0.25, lineCap: 'round' }).addTo(layer);
  L.polyline(arc, { color, weight: 2, opacity, dashArray: '6 8', lineCap: 'round' }).addTo(layer);
}

/**
 * Draw the flight's full route: a solid segment from the departure airport to
 * the current position, and a dashed forecast line from the current position
 * to the arrival airport. The forecast line is capped to the destination
 * (never extends beyond) and fades out during the final approach.
 */
export function useRouteOverlay({ selectedAircraft, showTrails }: { selectedAircraft: AircraftState | null; showTrails: boolean }) {
  // FeatureGroup (not plain LayerGroup) so MapView can call bringToFront() to
  // keep the route above the radar overlay — bringToFront lives on
  // FeatureGroup and forwards to each child polyline / airport dot.
  const routeLayerRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!routeLayerRef.current) routeLayerRef.current = L.featureGroup();
  }, []);

  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showTrails || !selectedAircraft) return;
    const e = resolveEndpoints(selectedAircraft);
    if (!e) return;

    const color = bluishForGround(getAltitudeColor(selectedAircraft.baroAltitude, selectedAircraft.onGround));
    const remainingKm = haversineDistance(e.acLat, e.acLon, e.arrLat, e.arrLon);

    const completedArc = generateArc(e.depLat, e.depLon, e.acLat, e.acLon, 30, e.heading);
    drawCompleted(layer, completedArc);

    if (remainingKm >= FINAL_APPROACH_KM) {
      const remainingArc = generateArc(e.acLat, e.acLon, e.arrLat, e.arrLon, pointsFor(remainingKm), e.heading);
      drawRemaining(layer, remainingArc, color, remainingOpacity(remainingKm));
    }

    drawAirportDot(layer, e.depLat, e.depLon, color, selectedAircraft.depIata!);
    drawAirportDot(layer, e.arrLat, e.arrLon, color, selectedAircraft.arrIata!);
  }, [selectedAircraft, showTrails]);

  return routeLayerRef;
}
