'use client';

import { ReactNode } from 'react';
import { formatTimeShort } from '@/app/(public)/dashboard/formatTimeShort';
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

/** Single schedule row. Three columns:
 *    flight code | peer airport | time (+optional delay chip)
 *  Sized so each column has predictable width — eye sweeps right-to-
 *  left in two beats instead of needing to parse a wall of identical
 *  text. */
function Row({
  flight,
  peer,
  timeKey,
}: {
  flight: AirportScheduleFlight;
  peer: Props['peer'];
  timeKey: Props['timeKey'];
}) {
  const delay = delayValue(flight, timeKey);
  const code = flight.flightIata || flight.flightIcao;
  const peerCode = peerIata(flight, peer);
  return (
    <div className="grid grid-cols-[5rem_4rem_1fr] items-center gap-2 t-label">
      <span className="t-mono font-bold text-[var(--primary-bright)] truncate" title={code}>
        {code}
      </span>
      <span className="text-[var(--text-secondary)] truncate" title={peerCode}>
        {peerCode}
      </span>
      <span className="flex items-center justify-end gap-1.5 tabular">
        <span className="text-[var(--text-primary)]">
          {formatTimeShort(timeValue(flight, timeKey))}
        </span>
        {(delay ?? 0) > 0 && (
          <span
            className="t-meta t-mono px-1 py-px rounded bg-[var(--error)]/15 text-[var(--error)]"
            aria-label={`delayed ${delay} minutes`}
          >
            +{delay}
          </span>
        )}
      </span>
    </div>
  );
}

/** Short dep- or arr-schedule list (max 5) for a dashboard airport card. */
export function ScheduleList({ icon, label, flights, peer, timeKey }: Props) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="t-meta t-mono font-bold text-[var(--text-secondary)] tracking-widest uppercase">
          {label}
        </span>
        <span className="t-meta t-mono text-[var(--text-muted)] tabular">
          ({flights.length})
        </span>
      </div>
      <div className="space-y-1">
        {flights.slice(0, 5).map((f, i) => (
          <Row key={`${f.flightIata}-${i}`} flight={f} peer={peer} timeKey={timeKey} />
        ))}
        {flights.length === 0 && (
          <span className="t-meta text-[var(--text-muted)]">— none scheduled</span>
        )}
      </div>
    </div>
  );
}
