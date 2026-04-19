'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { CONFIG } from '@/lib/constants';
import type { GeoFence } from '@/lib/flights/geofence';

export interface GeoFenceDraft {
  type: 'CIRCLE' | 'RECTANGLE';
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  northLat?: number;
  southLat?: number;
  eastLon?: number;
  westLon?: number;
}

interface Props {
  /** Called when the user finishes drawing a circle/rectangle. */
  onDraft: (draft: GeoFenceDraft) => void;
  /** Existing fences to render as read-only overlays. */
  existing?: GeoFence[];
}

/**
 * Interactive map for drawing circular or rectangular geo-fences.
 * Uses Leaflet-Draw. The drawn shape is translated into a {@link GeoFenceDraft}
 * payload that the form builder turns into a backend POST.
 *
 * Dynamic import from the page — Leaflet needs `window`.
 */
export function GeoFenceDrawMap({ onDraft, existing = [] }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current).setView(
      [CONFIG.defaultLat, CONFIG.defaultLon],
      6,
    );
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // leaflet-draw exposes Control.Draw on L.Control (added by the side-effect import).
    const drawControl = new (L.Control as unknown as {
      Draw: new (opts: unknown) => L.Control;
    }).Draw({
      edit: { featureGroup: drawnItems, remove: true },
      draw: {
        polygon: false,
        polyline: false,
        marker: false,
        circlemarker: false,
        circle: {
          shapeOptions: { color: '#7A9ABF', weight: 2, fillOpacity: 0.15 },
        },
        rectangle: {
          shapeOptions: { color: '#D4A574', weight: 2, fillOpacity: 0.15 },
        },
      },
    });
    map.addControl(drawControl);

    map.on('draw:created', (ev: unknown) => {
      const e = ev as { layer: L.Layer; layerType: string };
      drawnItems.clearLayers(); // only keep the most recent draft
      drawnItems.addLayer(e.layer);

      if (e.layerType === 'circle') {
        const c = e.layer as L.Circle;
        const center = c.getLatLng();
        onDraft({
          type: 'CIRCLE',
          centerLat: round(center.lat),
          centerLon: round(center.lng),
          radiusKm: round(c.getRadius() / 1000, 2),
        });
      } else if (e.layerType === 'rectangle') {
        const r = e.layer as L.Rectangle;
        const b = r.getBounds();
        onDraft({
          type: 'RECTANGLE',
          northLat: round(b.getNorth()),
          southLat: round(b.getSouth()),
          eastLon: round(b.getEast()),
          westLon: round(b.getWest()),
        });
      }
    });

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, [onDraft]);

  // Render existing fences as non-editable overlays.
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    const overlays: L.Layer[] = [];

    for (const f of existing) {
      if (f.type === 'CIRCLE' && f.centerLat != null && f.centerLon != null && f.radiusKm != null) {
        overlays.push(
          L.circle([f.centerLat, f.centerLon], {
            radius: f.radiusKm * 1000,
            color: '#4ADE80',
            weight: 1,
            fillOpacity: 0.08,
            interactive: false,
          }).bindTooltip(f.name).addTo(map),
        );
      } else if (f.type === 'RECTANGLE' && f.northLat != null) {
        overlays.push(
          L.rectangle(
            [[f.southLat!, f.westLon!], [f.northLat, f.eastLon!]],
            { color: '#4ADE80', weight: 1, fillOpacity: 0.08, interactive: false },
          ).bindTooltip(f.name).addTo(map),
        );
      }
    }

    return () => overlays.forEach((l) => l.remove());
  }, [existing]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[360px] rounded-md overflow-hidden border border-[var(--glass-border)]"
    />
  );
}

function round(n: number, decimals = 4): number {
  const m = 10 ** decimals;
  return Math.round(n * m) / m;
}
