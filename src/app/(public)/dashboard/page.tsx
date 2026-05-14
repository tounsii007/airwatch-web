'use client';

import { useMemo, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AddAirportInput } from '@/app/(public)/dashboard/AddAirportInput';
import { AirportCard } from '@/app/(public)/dashboard/AirportCard';
import { DashboardToolbar } from '@/app/(public)/dashboard/DashboardToolbar';
import { TopDelaysWidget } from '@/app/(public)/dashboard/TopDelaysWidget';
import { useDashboardAirports } from '@/app/(public)/dashboard/useDashboardAirports';
import { comparatorFor, type SortMode } from '@/app/(public)/dashboard/sortAirports';
import { PageContainer, Stagger, FadeIn } from '@/components/ui';

export default function DashboardPage() {
  const { language } = useSettingsStore();
  const {
    airports,
    addAirport,
    removeAirport,
    refresh,
    isRefreshing,
    lastUpdated,
  } = useDashboardAirports();
  const [newIata, setNewIata] = useState('');
  const [sort, setSort] = useState<SortMode>('alpha');

  const handleAdd = (iata: string) => {
    if (addAirport(iata)) setNewIata('');
  };

  const sortedAirports = useMemo(
    () => [...airports].sort(comparatorFor(sort)),
    [airports, sort],
  );

  const existingCodes = useMemo(() => airports.map((a) => a.iata), [airports]);

  return (
    <PageContainer
      maxWidth="6xl"
      title={t('dashboard', language)}
      subtitle={airports.length === 0 ? null : (
        <span className="badge badge-info badge-dot">
          {t('airports_tracked_count', language).replace('{0}', String(airports.length))}
        </span>
      )}
    >
      {/* relative+z-20 lifts this FadeIn (and its absolute autocomplete
          dropdown) above the later sibling FadeIns / Stagger, which each
          create their own stacking context via `animate-fade-up`'s
          transform and would otherwise paint on top of the dropdown. */}
      <FadeIn className="relative z-20">
        <AddAirportInput
          language={language}
          value={newIata}
          onChange={setNewIata}
          onAdd={handleAdd}
          existing={existingCodes}
        />
      </FadeIn>

      {airports.length > 0 && (
        <FadeIn delay={50} className="mt-3">
          <DashboardToolbar
            sort={sort}
            onSortChange={setSort}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
          />
        </FadeIn>
      )}

      <FadeIn delay={75} className="mt-6">
        <TopDelaysWidget />
      </FadeIn>

      {sortedAirports.length > 0 && (
        <FadeIn delay={100} className="mt-8 flex items-baseline justify-between gap-3">
          <h2 className="t-meta t-mono font-bold text-[var(--text-secondary)] tracking-widest uppercase">
            {t('tracked_airports', language)}
          </h2>
          <span className="t-meta t-mono text-[var(--text-muted)] tabular">
            {sortedAirports.length}
          </span>
        </FadeIn>
      )}

      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
        {sortedAirports.map((ap) => (
          <div key={ap.iata} className="animate-fade-up">
            <AirportCard airport={ap} language={language} onRemove={removeAirport} />
          </div>
        ))}
      </Stagger>
    </PageContainer>
  );
}
