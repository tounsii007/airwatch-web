'use client';

import { useMemo } from 'react';
import { Plane, Building2, Briefcase } from 'lucide-react';
import { useStatsStore } from '@/lib/stores/statsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { ActivityChart } from '@/app/(public)/stats/ActivityChart';
import { ActivityMeta } from '@/app/(public)/stats/ActivityMeta';
import { ClearHistoryButton } from '@/app/(public)/stats/ClearHistoryButton';
import { EmptyState } from '@/app/(public)/stats/EmptyState';
import { ExportButton } from '@/app/(public)/stats/ExportButton';
import { RecentFlightsList } from '@/app/(public)/stats/RecentFlightsList';
import { TopAirlinesList } from '@/app/(public)/stats/TopAirlinesList';
import { TopAirportsList } from '@/app/(public)/stats/TopAirportsList';
import { TopRoutesList } from '@/app/(public)/stats/TopRoutesList';
import {
  activitySummary,
  countUniqueAirlines,
  countUniqueAirports,
  recentFlights,
  topAirlines,
  topAirports,
  topRoutes,
  viewsByHour,
} from '@/app/(public)/stats/statsMetrics';
import { formatNumber, localeOf } from '@/app/(public)/stats/format';
import { PageContainer, FadeIn, StatCard, Stagger } from '@/components/ui';

export default function StatsPage() {
  const { viewedFlights, totalViews, clearStats } = useStatsStore();
  const { language } = useSettingsStore();
  const locale = localeOf(language);

  const uniqueAirlines = useMemo(() => countUniqueAirlines(viewedFlights), [viewedFlights]);
  const uniqueAirports = useMemo(() => countUniqueAirports(viewedFlights), [viewedFlights]);
  const top = useMemo(() => topAirlines(viewedFlights), [viewedFlights]);
  const routes = useMemo(() => topRoutes(viewedFlights), [viewedFlights]);
  const airports = useMemo(() => topAirports(viewedFlights), [viewedFlights]);
  const recent = useMemo(() => recentFlights(viewedFlights), [viewedFlights]);
  const hourBuckets = useMemo(() => viewsByHour(viewedFlights), [viewedFlights]);
  const summary = useMemo(() => activitySummary(viewedFlights), [viewedFlights]);

  const isEmpty = viewedFlights.length === 0;

  // Average views per unique flight — keep one decimal but trim a
  // trailing zero so we render "9" rather than "9.0".
  const avgViews = viewedFlights.length > 0
    ? Math.round((totalViews / viewedFlights.length) * 10) / 10
    : 0;
  const avgDecimals = avgViews % 1 === 0 ? 0 : 1;

  return (
    <PageContainer
      maxWidth="3xl"
      title={t('stats', language)}
      subtitle={
        isEmpty ? (
          <span className="badge">0 {t('flights_tracked', language)}</span>
        ) : (
          <span className="badge badge-info badge-dot">
            {formatNumber(viewedFlights.length, language)} {t('flights_tracked', language)}
          </span>
        )
      }
      actions={!isEmpty ? <ExportButton flights={viewedFlights} totalViews={totalViews} language={language} /> : undefined}
    >
      {/* Summary tiles — one per metric. Locale-aware count-up + a
          fourth "avg views" tile that only renders with data so the
          empty state stays clean (3 zeros, not 4). */}
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
              decimals={avgDecimals}
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
          <FadeIn delay={150}>
            <ActivityMeta summary={summary} language={language} />
          </FadeIn>
          <FadeIn delay={200}>
            <ActivityChart buckets={hourBuckets} language={language} />
          </FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn delay={250}>
              <TopAirlinesList entries={top} language={language} />
            </FadeIn>
            <FadeIn delay={300}>
              <TopRoutesList routes={routes} language={language} />
            </FadeIn>
            <FadeIn delay={350}>
              <TopAirportsList entries={airports} language={language} />
            </FadeIn>
            <FadeIn delay={400}>
              <RecentFlightsList flights={recent} language={language} />
            </FadeIn>
          </div>
          <FadeIn delay={450}>
            <ClearHistoryButton onClear={clearStats} language={language} />
          </FadeIn>
          {/* Locale handle kept around so tooling can see a single
              source of truth for the page's effective locale. */}
          <span data-locale={locale} aria-hidden className="sr-only" />
        </div>
      )}
    </PageContainer>
  );
}
