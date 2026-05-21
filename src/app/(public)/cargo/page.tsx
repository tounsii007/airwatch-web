'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n/translations';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { AircraftState } from '@/lib/types';
import { CargoList } from '@/app/(public)/cargo/CargoList';
import { CargoSearch } from '@/app/(public)/cargo/CargoSearch';
import { CargoStatsRow } from '@/app/(public)/cargo/CargoStatsRow';
import { filterCargo, isCargoFlight, type CargoStatusFilter } from '@/app/(public)/cargo/cargoFilter';
import { computeCargoStats } from '@/app/(public)/cargo/cargoStats';
import { PageContainer, FadeIn, CountUp } from '@/components/ui';
import { Tag } from '@/components/ui/Tag';

function byAltitudeDesc(a: AircraftState, b: AircraftState): number {
  return (b.baroAltitude ?? 0) - (a.baroAltitude ?? 0);
}

function collectCargo(aircraftMap: ReadonlyMap<string, AircraftState>): AircraftState[] {
  const out: AircraftState[] = [];
  aircraftMap.forEach((ac) => { if (isCargoFlight(ac)) out.push(ac); });
  return out.sort(byAltitudeDesc);
}

export default function CargoPage() {
  const { aircraftMap, startPolling, selectAircraft } = useFlightStore();
  const { altitudeUnit, speedUnit, language } = useSettingsStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CargoStatusFilter>('all');

  useEffect(() => { if (aircraftMap.size === 0) startPolling(); }, [aircraftMap.size, startPolling]);

  const cargoFlights = useMemo(() => collectCargo(aircraftMap), [aircraftMap]);
  const stats = useMemo(() => computeCargoStats(cargoFlights), [cargoFlights]);
  const filtered = useMemo(() => filterCargo(cargoFlights, search, statusFilter), [cargoFlights, search, statusFilter]);

  const handleTrack = (ac: AircraftState) => {
    selectAircraft(ac);
    router.push('/');
  };

  return (
    <PageContainer
      maxWidth="3xl"
      title={t('cargo_tracking', language)}
      subtitle={
        cargoFlights.length > 0 ? (
          <Tag variant="info" size="sm">
            <CountUp value={cargoFlights.length} /> cargo aircraft
          </Tag>
        ) : null
      }
    >
      <div className="space-y-4">
        <FadeIn>
          <CargoStatsRow
            stats={stats}
            filter={statusFilter}
            onFilter={setStatusFilter}
            language={language}
          />
        </FadeIn>
        <FadeIn delay={50}>
          <CargoSearch value={search} onChange={setSearch} language={language} />
        </FadeIn>
        <FadeIn delay={100}>
          <CargoList
            flights={filtered}
            totalLoaded={aircraftMap.size > 0}
            hasSearch={Boolean(search)}
            altitudeUnit={altitudeUnit}
            speedUnit={speedUnit}
            language={language}
            onTrack={handleTrack}
          />
        </FadeIn>
      </div>
    </PageContainer>
  );
}
