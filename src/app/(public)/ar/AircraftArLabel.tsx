'use client';

import { Plane } from 'lucide-react';
import { resolveAirline } from '@/lib/data/airlines';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import type { AltitudeUnit, SpeedUnit } from '@/lib/types';
import type { ArAircraft } from '@/app/(public)/ar/visibleAircraft';

interface Props {
  entry: ArAircraft;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  onSelect: () => void;
}

function displayCallsign(ac: ArAircraft['aircraft'], iata?: string): string {
  if (iata && ac.callsign) return `${iata}${ac.callsign.slice(3)}`;
  return ac.callsign ?? ac.icao24.toUpperCase();
}

function Reticle({ heading }: { heading?: number }) {
  const rotation = heading ?? 0;
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-[var(--primary)]/70 animate-pulse-glow" />
      <div
        className="relative text-[var(--primary)] drop-shadow-[0_0_6px_var(--primary)]"
        style={{ transform: `rotate(${rotation - 90}deg)` }}
      >
        <Plane size={18} strokeWidth={2.2} />
      </div>
    </div>
  );
}

/**
 * Tappable marker placed at the projected screen coordinates of a single
 * aircraft. Positioned absolutely by the parent; we apply the translation
 * here so the element's centre lands exactly on (x, y).
 */
export function AircraftArLabel({ entry, altitudeUnit, speedUnit, onSelect }: Props) {
  const { aircraft, distanceKm, screen } = entry;
  const airlineInfo = resolveAirline(aircraft.callsign ?? '');
  const language = useSettingsStore((s) => s.language);

  return (
    <button
      onClick={onSelect}
      className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer"
      style={{ left: `${screen.x}px`, top: `${screen.y}px` }}
      aria-label={t('aria_track_aircraft', language).replace('{0}', aircraft.callsign ?? aircraft.icao24)}
    >
      <Reticle heading={aircraft.trueTrack} />
      <div className="glass-panel rounded-lg px-2 py-1 min-w-[108px] text-center shadow-[0_0_20px_rgba(0,0,0,0.6)]">
        <div className="text-[11px] font-[var(--font-heading)] font-bold text-[var(--primary)] tracking-wider">
          {displayCallsign(aircraft, airlineInfo?.iata)}
        </div>
        <div className="flex justify-between gap-2 mt-0.5 text-[8px] text-[var(--text-muted)] font-[var(--font-body)]">
          <span>{formatAltitude(aircraft.baroAltitude, altitudeUnit)}</span>
          <span>{formatSpeed(aircraft.velocity, speedUnit)}</span>
        </div>
        <div className="text-[8px] text-[var(--text-muted)] font-[var(--font-body)]">
          {Math.round(distanceKm)} km
        </div>
      </div>
    </button>
  );
}
