'use client';

import { ReactNode } from 'react';
import { ManagedImage } from '@/components/common/ManagedImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AirlineLogo } from '@/components/flight/details/AirlineLogo';

interface Props {
  airlineIata: string | undefined;
  airlineName: string | undefined;
  displayCallsign: string;
  flightStatus: string | undefined;
  photoUrl: string | null;
  actions: ReactNode;
}

function TitleBlock({ displayCallsign, airlineName, flightStatus }: { displayCallsign: string; airlineName?: string; flightStatus: string | undefined }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="font-[var(--font-heading)] font-bold text-sm tracking-wider text-[var(--primary)] truncate"
          title={displayCallsign}
        >
          {displayCallsign}
        </span>
        <div className="shrink-0"><StatusBadge status={flightStatus} /></div>
      </div>
      {airlineName && <span className="text-[9px] text-[var(--text-muted)] truncate block">{airlineName}</span>}
    </div>
  );
}

function HeaderThumb({ photoUrl }: { photoUrl: string }) {
  return (
    <div className="relative w-14 h-10 rounded overflow-hidden shrink-0 mx-1">
      <ManagedImage src={photoUrl} alt="" fill sizes="56px" unoptimized className="object-cover" />
    </div>
  );
}

/** Mobile panel top row: airline logo / title / status / optional photo / actions. */
export function MobileHeader({ airlineIata, airlineName, displayCallsign, flightStatus, photoUrl, actions }: Props) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <AirlineLogo airlineIata={airlineIata} size="sm" />
        <TitleBlock displayCallsign={displayCallsign} airlineName={airlineName} flightStatus={flightStatus} />
      </div>
      {photoUrl && <HeaderThumb photoUrl={photoUrl} />}
      {actions}
    </div>
  );
}
