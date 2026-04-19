'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NeonText } from '@/components/ui/NeonText';
import { t } from '@/lib/i18n/translations';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { AircraftState } from '@/lib/types';
import { CargoList } from '@/app/cargo/CargoList';
import { CargoSearch } from '@/app/cargo/CargoSearch';
import { CargoStatsRow } from '@/app/cargo/CargoStatsRow';
import { filterCargo, isCargoFlight, type CargoStatusFilter } from '@/app/cargo/cargoFilter';
import { computeCargoStats } from '@/app/cargo/cargoStats';

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
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('cargo_tracking', language)} size="text-xl" />
      </div>
      <CargoStatsRow stats={stats} filter={statusFilter} onFilter={setStatusFilter} language={language} />
      <CargoSearch value={search} onChange={setSearch} language={language} />
      <CargoList
        flights={filtered}
        totalLoaded={aircraftMap.size > 0}
        hasSearch={Boolean(search)}
        altitudeUnit={altitudeUnit}
        speedUnit={speedUnit}
        language={language}
        onTrack={handleTrack}
      />
    </div>
  );
}
