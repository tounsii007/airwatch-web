'use client';

import { useMemo } from 'react';
import { Plane, Building2, Briefcase } from 'lucide-react';
import { useStatsStore } from '@/lib/stores/statsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { ClearHistoryButton } from '@/app/(public)/stats/ClearHistoryButton';
import { EmptyState } from '@/app/(public)/stats/EmptyState';
import { RecentFlightsList } from '@/app/(public)/stats/RecentFlightsList';
import { TopAirlinesList } from '@/app/(public)/stats/TopAirlinesList';
import {
  countUniqueAirlines,
  countUniqueAirports,
  recentFlights,
  topAirlines,
} from '@/app/(public)/stats/statsMetrics';
import { PageContainer, FadeIn, StatCard, Stagger } from '@/components/ui';

export default function StatsPage() {
  const { viewedFlights, totalViews, clearStats } = useStatsStore();
  const { language } = useSettingsStore();

  const uniqueAirlines = useMemo(() => countUniqueAirlines(viewedFlights), [viewedFlights]);
  const uniqueAirports = useMemo(() => countUniqueAirports(viewedFlights), [viewedFlights]);
  const top = useMemo(() => topAirlines(viewedFlights), [viewedFlights]);
  const recent = useMemo(() => recentFlights(viewedFlights), [viewedFlights]);

  const isEmpty = viewedFlights.length === 0;

  // Average views per unique flight — a small derived metric that gives
  // the empty state more shape than three "0" tiles. When there are no
  // flights it stays 0 (StatCard renders the muted dash treatment).
  const avgViews = viewedFlights.length > 0
    ? Math.round((totalViews / viewedFlights.length) * 10) / 10
    : 0;

  return (
    <PageContainer
      maxWidth="3xl"
      title={t('stats', language)}
      subtitle={
        isEmpty ? (
          <span className="badge">0 {t('flights_tracked', language)}</span>
        ) : (
          <span className="badge badge-info badge-dot">
            {viewedFlights.length} {t('flights_tracked', language)}
          </span>
        )
      }
    >
      {/* Summary tiles — one per metric. Icons sit in the right slot
          inside a soft accent halo so each card reads as a "topic"
          rather than a bare number. The grid adapts to 2/3 cols and the
          fourth tile (avg views) only renders when we have data so the
          empty state stays clean. */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="animate-fade-up">
          <StatCard
            label={t('total_viewed', language)}
            value={totalViews}
            icon={<Plane size={18} strokeWidth={2.25} />}
          />
        </div>
        <div className="animate-fade-up">
          <StatCard
            label={t('unique_airlines', language)}
            value={uniqueAirlines}
            status="info"
            icon={<Briefcase size={18} strokeWidth={2.25} />}
          />
        </div>
        <div className="animate-fade-up">
          <StatCard
            label={t('unique_airports', language)}
            value={uniqueAirports}
            status="success"
            icon={<Building2 size={18} strokeWidth={2.25} />}
          />
        </div>
        {!isEmpty && (
          <div className="animate-fade-up">
            <StatCard
              label={t('avg_views_per_flight', language)}
              value={avgViews}
              decimals={avgViews % 1 === 0 ? 0 : 1}
              status="warning"
              icon={<Plane size={18} strokeWidth={2.25} className="rotate-45" />}
            />
          </div>
        )}
      </Stagger>

      {isEmpty ? (
        <FadeIn delay={200}>
          <EmptyState language={language} />
        </FadeIn>
      ) : (
        <div className="space-y-6">
          <FadeIn delay={200}>
            <TopAirlinesList entries={top} language={language} />
          </FadeIn>
          <FadeIn delay={300}>
            <RecentFlightsList flights={recent} language={language} />
          </FadeIn>
          <FadeIn delay={400}>
            <ClearHistoryButton onClear={clearStats} language={language} />
          </FadeIn>
        </div>
      )}
    </PageContainer>
  );
}
