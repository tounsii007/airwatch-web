'use client';

import { Plane } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AirlineFlight } from '@/app/(public)/airlines/[icao]/airlineTypes';

interface Props {
  flight: AirlineFlight;
  isLive: boolean;
  onClick?: () => void;
}

function Route({ flight }: { flight: AirlineFlight }) {
  if (flight.depIata && flight.arrIata) {
    return (
      <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] mt-0.5">
        {flight.depIata} → {flight.arrIata}
      </div>
    );
  }
  return (
    <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)] mt-0.5">
      {flight.flightIcao}
    </div>
  );
}

function AircraftPill({ aircraftIcao }: { aircraftIcao: string }) {
  if (!aircraftIcao) return null;
  return (
    <span className="text-[9px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-light)]/50 text-[var(--text-muted)]">
      {aircraftIcao}
    </span>
  );
}

/** One flight row on the airline detail page — clickable when the flight is live. */
export function FlightRow({ flight, isLive, onClick }: Props) {
  const clickable = isLive ? 'cursor-pointer hover:bg-white/5' : '';
  return (
    <GlassPanel className={`p-3 flex items-center justify-between ${clickable}`} onClick={isLive ? onClick : undefined}>
      <div className="flex items-center gap-3">
        <Plane size={14} className="text-[var(--primary)] shrink-0" />
        <div>
          <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--text-primary)]">
            {flight.flightIata || flight.flightIcao}
          </span>
          <Route flight={flight} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AircraftPill aircraftIcao={flight.aircraftIcao} />
        <StatusBadge status={flight.status} />
      </div>
    </GlassPanel>
  );
}
