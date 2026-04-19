'use client';

import { useEffect, useMemo, useState } from 'react';
import { NeonText } from '@/components/ui/NeonText';
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
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('airports', language)} size="text-xl" />
      </div>
      <StatsRow stats={stats} language={language} />
      <QuickLinks language={language} />
      <PopularAirportsStrip airports={filteredAirports} language={language} />
      <AirportSearch value={search} onChange={setSearch} language={language} />
      <DeparturesList
        flights={filteredDepartures}
        totalLoaded={aircraftMap.size > 0}
        altitudeUnit={altitudeUnit}
        speedUnit={speedUnit}
        language={language}
      />
    </div>
  );
}
