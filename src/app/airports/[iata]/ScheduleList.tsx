'use client';

import { ArrowUpDown } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { ScheduleRow } from '@/app/airports/[iata]/ScheduleRow';
import type { AirportScheduleFlight, AppLanguage } from '@/lib/types';
import type { TabType } from '@/app/airports/[iata]/ScheduleTabs';

export type SortBy = 'time' | 'delay';

interface Props {
  flights: AirportScheduleFlight[];
  loading: boolean;
  tab: TabType;
  language: AppLanguage;
  sortBy: SortBy;
  onToggleSort: () => void;
}

function EmptyRow({ message }: { message: string }) {
  return (
    <GlassPanel className="p-6 text-center">
      <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">{message}</p>
    </GlassPanel>
  );
}

function SortToggle({ sortBy, onToggle, language }: { sortBy: SortBy; onToggle: () => void; language: AppLanguage }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
      >
        <ArrowUpDown size={11} />
        {sortBy === 'time' ? t('delayed', language) : t('scheduled_short', language)}
      </button>
    </div>
  );
}

/** Departure/arrival schedule list with sort-toggle + empty / loading states. */
export function ScheduleList({ flights, loading, tab, language, sortBy, onToggleSort }: Props) {
  if (loading) return <EmptyRow message={t('loading_schedule', language)} />;
  if (flights.length === 0) return <EmptyRow message={t('no_flights', language)} />;
  return (
    <>
      <SortToggle sortBy={sortBy} onToggle={onToggleSort} language={language} />
      <div className="space-y-2">
        {flights.map((f, i) => (
          <ScheduleRow key={`${f.flightIata}-${i}`} flight={f} tab={tab} language={language} />
        ))}
      </div>
    </>
  );
}
