'use client';

import { useMemo, useState } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useEnsurePolling } from '@/lib/hooks/useEnsurePolling';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AirportSearch } from '@/app/(public)/airports/AirportSearch';
import { DeparturesList } from '@/app/(public)/airports/DeparturesList';
import { NearbyAirportsPanel } from '@/app/(public)/airports/NearbyAirportsPanel';
import { PopularAirportsStrip } from '@/app/(public)/airports/PopularAirportsStrip';
import { QuickLinks } from '@/app/(public)/airports/QuickLinks';
import { StatsRow } from '@/app/(public)/airports/StatsRow';
import { POPULAR_AIRPORTS } from '@/app/(public)/airports/popularAirports';
import {
  collectRecentDepartures,
  computeAirborneStats,
  filterAirports,
  filterDepartures,
} from '@/app/(public)/airports/airportsStats';
import { PageContainer, FadeIn } from '@/components/ui';

export default function AirportsPage() {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const { altitudeUnit, speedUnit, language } = useSettingsStore();
  const [search, setSearch] = useState('');

  useEnsurePolling();

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
        <FadeIn delay={75}>
          <NearbyAirportsPanel />
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
