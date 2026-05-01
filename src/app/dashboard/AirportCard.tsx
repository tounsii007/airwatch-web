'use client';

import { useMemo } from 'react';
import { PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Skeleton } from '@/components/ui';
import { t } from '@/lib/i18n/translations';
import { AirportCardHeader } from '@/app/dashboard/AirportCardHeader';
import { AirportStatStrip } from '@/app/dashboard/AirportStatStrip';
import { HourDistribution } from '@/app/dashboard/HourDistribution';
import { ScheduleList } from '@/app/dashboard/ScheduleList';
import { computeMetrics } from '@/app/dashboard/airportMetrics';
import type { DashboardAirport } from '@/app/dashboard/dashboardData';
import type { AppLanguage } from '@/lib/types';

interface Props {
  airport: DashboardAirport;
  language: AppLanguage;
  onRemove: (iata: string) => void;
}

/** Skeleton that matches the loaded card geometry exactly so the
 *  switch from "loading" to "loaded" produces zero layout shift. */
function CardSkeleton() {
  return (
    <div className="space-y-3 mt-2">
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton.Block key={i} height="2.75rem" />
        ))}
      </div>
      <Skeleton.Block height="1.5rem" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton.Line width="40%" />
          {[0, 1, 2, 3, 4].map((i) => <Skeleton.Line key={i} />)}
        </div>
        <div className="space-y-1.5">
          <Skeleton.Line width="40%" />
          {[0, 1, 2, 3, 4].map((i) => <Skeleton.Line key={i} />)}
        </div>
      </div>
    </div>
  );
}

function SchedulesGrid({ airport, language }: { airport: DashboardAirport; language: AppLanguage }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ScheduleList
        icon={<PlaneTakeoff size={12} className="text-[var(--success)]" aria-hidden />}
        label={t('departure', language)}
        flights={airport.departures}
        peer="arr"
        timeKey="dep"
      />
      <ScheduleList
        icon={<PlaneLanding size={12} className="text-[var(--accent)]" aria-hidden />}
        label={t('arrival', language)}
        flights={airport.arrivals}
        peer="dep"
        timeKey="arr"
      />
    </div>
  );
}

/** One dashboard airport card. Header → stat strip → hour distribution
 *  → dep/arr schedule grid. The stat strip + chart turn this from a
 *  "list of schedules" into an actual dashboard tile. */
export function AirportCard({ airport, language, onRemove }: Props) {
  const metrics = useMemo(
    () => computeMetrics(airport.departures, airport.arrivals),
    [airport.departures, airport.arrivals],
  );

  return (
    <GlassPanel className="p-4 space-y-3">
      <AirportCardHeader airport={airport} language={language} onRemove={onRemove} />
      {airport.loading ? (
        <CardSkeleton />
      ) : (
        <>
          <AirportStatStrip metrics={metrics} iata={airport.iata} />
          {metrics.total > 0 && (
            <HourDistribution
              buckets={metrics.hourBuckets}
              peakHour={metrics.busiestHour}
              ariaLabel={`Hourly flight distribution at ${airport.iata}`}
            />
          )}
          <SchedulesGrid airport={airport} language={language} />
        </>
      )}
    </GlassPanel>
  );
}
