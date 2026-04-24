'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { API } from '@/lib/constants';
import { airportCity } from '@/lib/data/airports';
import { localizeCity } from '@/lib/data/city-translations';
import { t } from '@/lib/i18n/translations';
import { formatScheduleTime } from '@/app/airports/[iata]/mapScheduleFlight';
import type { AirportScheduleFlight, AppLanguage } from '@/lib/types';
import type { TabType } from '@/app/airports/[iata]/ScheduleTabs';

interface Props {
  flight: AirportScheduleFlight;
  tab: TabType;
  language: AppLanguage;
}

function pickTime(f: AirportScheduleFlight, tab: TabType) {
  return tab === 'departures' ? f.depTime : f.arrTime;
}

function pickDelay(f: AirportScheduleFlight, tab: TabType) {
  return tab === 'departures' ? f.depDelayed : f.arrDelayed;
}

function pickPeerIata(f: AirportScheduleFlight, tab: TabType) {
  return tab === 'departures' ? f.arrIata : f.depIata;
}

function pickTerminal(f: AirportScheduleFlight, tab: TabType) {
  return tab === 'departures' ? f.depTerminal : f.arrTerminal;
}

function pickGate(f: AirportScheduleFlight, tab: TabType) {
  return tab === 'departures' ? f.depGate : f.arrGate;
}

function delayClass(delay: number): string {
  if (delay >= 30) return 'bg-red-500/20 text-red-400';
  if (delay >= 15) return 'bg-orange-500/15 text-orange-400';
  return 'bg-yellow-500/15 text-yellow-400';
}

function DelayPill({ delay, language }: { delay: number | undefined; language: AppLanguage }) {
  if (delay != null && delay > 0) {
    return (
      <span className={`inline-block mt-0.5 text-[8px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded ${delayClass(delay)}`}>
        +{delay} min
      </span>
    );
  }
  return (
    <span className="inline-block mt-0.5 text-[8px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
      {t('on_time', language)}
    </span>
  );
}

function TimeColumn({ flight, tab, language }: Props) {
  return (
    <div className="text-center min-w-[48px] shrink-0">
      <div className="text-sm font-[var(--font-heading)] font-bold text-[var(--text-primary)]">
        {formatScheduleTime(pickTime(flight, tab))}
      </div>
      <DelayPill delay={pickDelay(flight, tab)} language={language} />
    </div>
  );
}

function AirlineLogoLink({ flight }: { flight: AirportScheduleFlight }) {
  if (!flight.airlineIata) return null;
  const href = `/airlines/${flight.flightIcao?.slice(0, 3) || flight.airlineIata}`;
  return (
    <Link href={href}>
      <div className="bg-white rounded px-1.5 py-0.5 shrink-0 shadow-sm hover:shadow transition-shadow">
        <Image src={API.airlineLogo(flight.airlineIata)} alt={flight.airlineIata} width={60} height={22} className="object-contain" unoptimized />
      </div>
    </Link>
  );
}

function FlightInfo({ flight, tab, language }: { flight: AirportScheduleFlight; tab: TabType; language: AppLanguage }) {
  const peer = pickPeerIata(flight, tab);
  const peerCity = peer ? localizeCity(airportCity(peer), language) : '';
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--primary)]">
          {flight.flightIata || flight.flightIcao}
        </span>
        <AirlineLogoLink flight={flight} />
      </div>
      <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] mt-0.5 truncate">
        {tab === 'departures' ? '→' : '←'}{' '}
        <span className="font-[var(--font-heading)] font-bold">{peer || '--'}</span>
        {peerCity && <span className="ml-1 text-[var(--text-muted)]">{peerCity}</span>}
      </div>
    </div>
  );
}

function TerminalGate({ flight, tab, language }: Props) {
  const terminal = pickTerminal(flight, tab);
  const gate = pickGate(flight, tab);
  return (
    <div className="text-right shrink-0 ml-2">
      {(terminal || gate) && (
        <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
          {terminal ? `${t('terminal_short', language)}${terminal}` : ''}
          {gate ? ` ${t('gate_short', language)} ${gate}` : ''}
        </div>
      )}
      <StatusBadge status={flight.status} className="mt-0.5" />
    </div>
  );
}

/** One schedule row (time + flight + airline logo + terminal + status). */
export function ScheduleRow({ flight, tab, language }: Props) {
  return (
    <GlassPanel className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <TimeColumn flight={flight} tab={tab} language={language} />
          <FlightInfo flight={flight} tab={tab} language={language} />
        </div>
        <TerminalGate flight={flight} tab={tab} language={language} />
      </div>
    </GlassPanel>
  );
}
