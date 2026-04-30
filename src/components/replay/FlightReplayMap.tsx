'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FlightPosition } from '@/lib/flights/replay';
import { CONFIG, CONVERSION } from '@/lib/constants';

interface Props {
  positions: FlightPosition[];
}

/**
 * Map that replays a flight's position history on a timeline slider.
 * Draws the full track as a polyline and animates an aircraft marker
 * through each point. User can scrub manually or press play.
 */
export function FlightReplayMap({ positions }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trackLayerRef = useRef<L.Polyline | null>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4); // multiplier vs. wall-clock

  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [positions],
  );

  // Init map (once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      [CONFIG.defaultLat, CONFIG.defaultLon],
      5,
    );
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw track + marker when positions arrive
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sortedPositions.length === 0) return;

    trackLayerRef.current?.remove();
    const latlngs: L.LatLngExpression[] = sortedPositions.map(
      (p) => [p.latitude, p.longitude] as [number, number],
    );
    const track = L.polyline(latlngs, {
      color: '#7A9ABF',
      weight: 2,
      opacity: 0.8,
    }).addTo(map);
    trackLayerRef.current = track;

    // Fit to the track
    map.fitBounds(track.getBounds(), { padding: [40, 40] });

    // Create / move marker
    markerRef.current?.remove();
    const first = sortedPositions[0];
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#D4A574;box-shadow:0 0 10px #D4A574;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    markerRef.current = L.marker([first.latitude, first.longitude], { icon }).addTo(map);

    // Intentional: reset playhead when the track changes. Cheap, runs once per input.
     
    setIndex(0);
  }, [sortedPositions]);

  // Update marker when index changes
  useEffect(() => {
    if (!markerRef.current || sortedPositions.length === 0) return;
    const p = sortedPositions[Math.min(index, sortedPositions.length - 1)];
    markerRef.current.setLatLng([p.latitude, p.longitude]);
  }, [index, sortedPositions]);

  // Play loop
  useEffect(() => {
    if (!playing) return;
    // Step one position per (1000 / speed) ms. Wrap around to 0 at the end.
    const interval = Math.max(50, 1000 / speed);
    const timer = setInterval(() => {
      setIndex((i) => {
        if (i >= sortedPositions.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [playing, speed, sortedPositions.length]);

  const current = sortedPositions[index];
  const timeLabel = current ? new Date(current.timestamp).toLocaleString() : '';

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={mapContainerRef}
        className="w-full h-[420px] rounded-md overflow-hidden border border-[var(--glass-border)]"
      />

      {sortedPositions.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-[11px] font-[var(--font-heading)] tracking-wider">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="bg-[var(--primary)] text-[var(--bg)] px-3 py-1.5 font-bold disabled:opacity-40"
              disabled={index >= sortedPositions.length - 1 && !playing}
            >
              {playing ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <button
              onClick={() => { setPlaying(false); setIndex(0); }}
              className="border border-[var(--glass-border)] px-3 py-1.5"
            >
              ⏮ RESET
            </button>
            <label className="flex items-center gap-1 ml-auto">
              SPEED
              <select
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                className="bg-transparent border border-[var(--glass-border)] px-1 py-0.5"
              >
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
                <option value={8}>8×</option>
                <option value={16}>16×</option>
              </select>
            </label>
          </div>

          <input
            type="range"
            min={0}
            max={sortedPositions.length - 1}
            value={index}
            onChange={(e) => { setPlaying(false); setIndex(parseInt(e.target.value, 10)); }}
            className="w-full accent-[var(--primary)]"
          />

          <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>{new Date(sortedPositions[0].timestamp).toLocaleString()}</span>
            <span className="text-[var(--text)]">{timeLabel}</span>
            <span>{new Date(sortedPositions.at(-1)!.timestamp).toLocaleString()}</span>
          </div>

          {current && (
            <div className="grid grid-cols-4 gap-2 text-[10px] font-[var(--font-heading)]">
              <Stat label="ALT" value={`${Math.round(current.altitude * CONVERSION.metersToFeet).toLocaleString()} ft`} />
              <Stat label="SPD" value={`${Math.round(current.speed * 0.539957)} kts`} />
              <Stat label="HDG" value={`${Math.round(current.heading)}°`} />
              <Stat label="V/S" value={`${Math.round(current.verticalSpeed * CONVERSION.msToFpm / 60)} fpm`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center border border-[var(--glass-border)]/40 py-1">
      <div className="text-[var(--text-muted)] tracking-widest text-[9px]">{label}</div>
      <div className="text-[var(--text)]">{value}</div>
    </div>
  );
}
