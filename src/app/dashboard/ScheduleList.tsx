'use client';

import { ReactNode } from 'react';
import { formatTimeShort } from '@/app/dashboard/formatTimeShort';
import type { AirportScheduleFlight } from '@/lib/types';

interface Props {
  icon: ReactNode;
  label: string;
  flights: AirportScheduleFlight[];
  /** Which peer airport IATA to show per row. */
  peer: 'arr' | 'dep';
  /** Which time + delay key to show per row. */
  timeKey: 'dep' | 'arr';
}

function peerIata(flight: AirportScheduleFlight, peer: Props['peer']): string | undefined {
  return peer === 'arr' ? flight.arrIata : flight.depIata;
}

function timeValue(flight: AirportScheduleFlight, key: Props['timeKey']): string | undefined {
  return key === 'dep' ? flight.depTime : flight.arrTime;
}

function delayValue(flight: AirportScheduleFlight, key: Props['timeKey']): number | undefined {
  return key === 'dep' ? flight.depDelayed : flight.arrDelayed;
}

function Row({ flight, peer, timeKey }: { flight: AirportScheduleFlight; peer: Props['peer']; timeKey: Props['timeKey'] }) {
  const delay = delayValue(flight, timeKey);
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="font-[var(--font-heading)] font-bold text-[var(--primary)]">{flight.flightIata || flight.flightIcao}</span>
      <span className="text-[var(--text-secondary)]">{peerIata(flight, peer)}</span>
      <span className="text-[var(--text-muted)]">{formatTimeShort(timeValue(flight, timeKey))}</span>
      {(delay ?? 0) > 0 && <span className="text-[var(--error)] text-[8px]">+{delay}</span>}
    </div>
  );
}

/** Short dep- or arr-schedule list (max 5) for a dashboard airport card. */
export function ScheduleList({ icon, label, flights, peer, timeKey }: Props) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        {icon}
        <span className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
          {label} ({flights.length})
        </span>
      </div>
      <div className="space-y-1">
        {flights.slice(0, 5).map((f, i) => (
          <Row key={`${f.flightIata}-${i}`} flight={f} peer={peer} timeKey={timeKey} />
        ))}
        {flights.length === 0 && <span className="text-[9px] text-[var(--text-muted)]">--</span>}
      </div>
    </div>
  );
}
