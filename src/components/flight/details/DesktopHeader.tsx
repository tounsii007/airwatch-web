'use client';

import { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AirlineLogo } from '@/components/flight/details/AirlineLogo';

interface Props {
  airlineIata: string | undefined;
  airlineName: string | undefined;
  displayCallsign: string;
  icao24: string;
  flightStatus: string | undefined;
  originCountry?: string;
  actions: ReactNode;
}

function CountryPill({ country }: { country?: string }) {
  if (!country) return null;
  return (
    <span className="text-[10px] font-[var(--font-heading)] px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
      {country}
    </span>
  );
}

function Title({ displayCallsign }: { displayCallsign: string }) {
  return (
    <h2
      className="neon-text font-[var(--font-heading)] font-bold text-xl tracking-wider truncate min-w-0"
      style={{ color: 'var(--primary)' }}
      title={displayCallsign}
    >
      {displayCallsign}
    </h2>
  );
}

function SubLine({ icao24, flightStatus, airlineName }: { icao24: string; flightStatus: string | undefined; airlineName?: string }) {
  return (
    <div className="flex items-center gap-2 mt-0.5 min-w-0">
      <span className="text-[var(--text-muted)] text-xs shrink-0">{icao24.toUpperCase()}</span>
      <StatusBadge status={flightStatus} />
      {airlineName && <span className="text-[10px] text-[var(--text-secondary)] truncate">{airlineName}</span>}
    </div>
  );
}

/**
 * Desktop sidebar top row: logo / callsign / sub-info / actions.
 * Uses `min-w-0` on the flex children so long airline names or callsigns
 * truncate cleanly instead of pushing the action buttons off-screen.
 */
export function DesktopHeader(props: Props) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-[var(--glass-border)]">
      <AirlineLogo airlineIata={props.airlineIata} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Title displayCallsign={props.displayCallsign} />
          <CountryPill country={props.originCountry} />
        </div>
        <SubLine icao24={props.icao24} flightStatus={props.flightStatus} airlineName={props.airlineName} />
      </div>
      <div className="shrink-0">{props.actions}</div>
    </div>
  );
}
