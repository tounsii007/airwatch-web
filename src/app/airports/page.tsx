'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AirportSearch } from '@/app/airports/AirportSearch';
import { DeparturesList } from '@/app/airports/DeparturesList';
import { PopularAirportsStrip } from '@/app/airports/PopularAirportsStrip';
import { QuickLinks } from '@/app/airports/QuickLinks';
import { StatsRow } from '@/app/airports/StatsRow';
import { POPULAR_AIRPORTS } from '@/app/airports/popularAirports';
import {
  collectRecentDepartures,
  computeAirborneStats,
  filterAirports,
  filterDepartures,
} from '@/app/airports/airportsStats';
import { PageContainer, FadeIn } from '@/components/ui';

export default function AirportsPage() {
  const { aircraftMap, startPolling } = useFlightStore();
  const { altitudeUnit, speedUnit, language } = useSettingsStore();
  const [search, setSearch] = useState('');

  useEffect(() => { if (aircraftMap.size === 0) startPolling(); }, [aircraftMap.size, startPolling]);

  const stats = useMemo(() => computeAirborneStats(aircraftMap), [aircraftMap]);
  const recent = useMemo(() => collectRecentDepartures(aircraftMap), [aircraftMap]);
  const filteredDepartures = useMemo(() => filterDepartures(recent, search), [recent, search]);
  const filteredAirports = useMemo(() => filterAirports(POPULAR_AIRPORTS, search), [search]);

  return (
    <PageContainer maxWidth="3xl" title={t('airports', language)}>
      <div className="space-y-4">
        <FadeIn>
          <StatsRow stats={stats} language={language} />
        </FadeIn>
        <FadeIn delay={50}>
          <QuickLinks language={language} />
        </FadeIn>
        <FadeIn delay={100}>
          <PopularAirportsStrip airports={filteredAirports} language={language} />
        </FadeIn>
        <FadeIn delay={150}>
          <AirportSearch value={search} onChange={setSearch} language={language} />
        </FadeIn>
        <FadeIn delay={200}>
          <DeparturesList
            flights={filteredDepartures}
            totalLoaded={aircraftMap.size > 0}
            altitudeUnit={altitudeUnit}
            speedUnit={speedUnit}
            language={language}
          />
        </FadeIn>
      </div>
    </PageContainer>
  );
}
