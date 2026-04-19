'use client';

import { PlaneLanding, PlaneTakeoff, RefreshCw } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { AirportCardHeader } from '@/app/dashboard/AirportCardHeader';
import { ScheduleList } from '@/app/dashboard/ScheduleList';
import type { DashboardAirport } from '@/app/dashboard/dashboardData';
import type { AppLanguage } from '@/lib/types';

interface Props {
  airport: DashboardAirport;
  language: AppLanguage;
  onRemove: (iata: string) => void;
}

function LoadingRow({ language }: { language: AppLanguage }) {
  return (
    <div className="flex items-center justify-center py-4 gap-2">
      <RefreshCw size={14} className="text-[var(--primary)] animate-spin" />
      <span className="text-xs text-[var(--text-muted)]">{t('loading', language)}</span>
    </div>
  );
}

function SchedulesGrid({ airport, language }: { airport: DashboardAirport; language: AppLanguage }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ScheduleList
        icon={<PlaneTakeoff size={11} className="text-[var(--success)]" />}
        label={t('departure', language)}
        flights={airport.departures}
        peer="arr"
        timeKey="dep"
      />
      <ScheduleList
        icon={<PlaneLanding size={11} className="text-[var(--accent)]" />}
        label={t('arrival', language)}
        flights={airport.arrivals}
        peer="dep"
        timeKey="arr"
      />
    </div>
  );
}

/** One dashboard airport card: header + loading indicator or dep/arr schedules. */
export function AirportCard({ airport, language, onRemove }: Props) {
  return (
    <GlassPanel className="p-4 space-y-3">
      <AirportCardHeader airport={airport} onRemove={onRemove} />
      {airport.loading ? <LoadingRow language={language} /> : <SchedulesGrid airport={airport} language={language} />}
    </GlassPanel>
  );
}
