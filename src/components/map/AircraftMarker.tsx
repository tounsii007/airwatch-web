'use client';

import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { AircraftState } from '@/lib/types';
import { getAltitudeColor } from '@/lib/utils';

interface AircraftMarkerProps {
  aircraft: AircraftState;
  isSelected: boolean;
  onClick: (aircraft: AircraftState) => void;
}

function createPlaneIcon(color: string, rotation: number, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 28 : 20;
  const pulse = isSelected
    ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};animation:pulse-glow 1.5s ease-in-out infinite;"></div>`
    : '';

  const svg = `
    <div style="position:relative;width:${size}px;height:${size}px;transform:rotate(${rotation}deg);filter:drop-shadow(0 0 4px ${color});">
      ${pulse}
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 L10 8 L3 10 L3 12 L10 11 L10 17 L7 19 L7 20.5 L12 19 L17 20.5 L17 19 L14 17 L14 11 L21 12 L21 10 L14 8 Z"/>
      </svg>
    </div>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function AircraftMarker({ aircraft, isSelected, onClick }: AircraftMarkerProps) {
  const { latitude, longitude, trueTrack, baroAltitude, onGround, callsign } = aircraft;

  const color = getAltitudeColor(baroAltitude, onGround);
  const rotation = trueTrack ?? 0;

  const icon = useMemo(
    () => createPlaneIcon(color, rotation, isSelected),
    [color, rotation, isSelected]
  );

  if (latitude == null || longitude == null) return null;

  return (
    <Marker
      position={[latitude, longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onClick(aircraft),
      }}
    >
      {isSelected && callsign && (
        <Tooltip
          direction="top"
          offset={[0, -16]}
          permanent
          className="aircraft-tooltip"
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1px',
              color: '#E0F0FF',
              background: 'rgba(21, 21, 21, 0.92)',
              border: `1px solid ${color}`,
              borderRadius: '4px',
              padding: '2px 6px',
              whiteSpace: 'nowrap',
            }}
          >
            {callsign}
          </span>
        </Tooltip>
      )}
    </Marker>
  );
}
