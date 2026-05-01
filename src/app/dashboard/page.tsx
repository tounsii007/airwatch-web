'use client';

import { useMemo, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AddAirportInput } from '@/app/dashboard/AddAirportInput';
import { AirportCard } from '@/app/dashboard/AirportCard';
import { DashboardToolbar } from '@/app/dashboard/DashboardToolbar';
import { useDashboardAirports } from '@/app/dashboard/useDashboardAirports';
import { comparatorFor, type SortMode } from '@/app/dashboard/sortAirports';
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
          {airports.length} airports tracked
        </span>
      )}
    >
      <FadeIn>
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

      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {sortedAirports.map((ap) => (
          <div key={ap.iata} className="animate-fade-up">
            <AirportCard airport={ap} language={language} onRemove={removeAirport} />
          </div>
        ))}
      </Stagger>
    </PageContainer>
  );
}
