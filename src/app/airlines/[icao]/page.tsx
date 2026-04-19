'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMounted } from '@/lib/hooks/useMounted';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { AirlineHeader } from '@/app/airlines/[icao]/AirlineHeader';
import { AirlineStatsGrid } from '@/app/airlines/[icao]/AirlineStatsGrid';
import { FlightSearch } from '@/app/airlines/[icao]/FlightSearch';
import { FlightsSection } from '@/app/airlines/[icao]/FlightsSection';
import { computeAirlineStats, filterFlights } from '@/app/airlines/[icao]/airlineStats';
import { useAirlineDetail } from '@/app/airlines/[icao]/useAirlineDetail';
import { useAirlineFlights } from '@/app/airlines/[icao]/useAirlineFlights';

export default function AirlineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const icao = (params.icao as string).toUpperCase();
  const language = useSettingsStore((s) => s.language);
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const mounted = useMounted();

  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const startPolling = useFlightStore((s) => s.startPolling);
  useEffect(() => { if (aircraftMap.size === 0) startPolling(); }, [aircraftMap.size, startPolling]);

  const { airline, apiFlights } = useAirlineDetail(icao);
  const airlineFlights = useAirlineFlights(icao, apiFlights);

  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterFlights(airlineFlights, search), [airlineFlights, search]);
  const stats = useMemo(() => computeAirlineStats(airlineFlights), [airlineFlights]);

  const saved = mounted && isFavorite(`airline-${icao}`);
  const handleToggleFavorite = () =>
    toggleFavorite({
      id: `airline-${icao}`,
      type: 'airline',
      label: icao,
      subtitle: airline?.name ?? icao,
      addedAt: Date.now(),
    });

  return (
    <div className="p-4 space-y-4">
      <AirlineHeader
        icao={icao}
        airline={airline}
        language={language}
        mounted={mounted}
        saved={saved}
        onBack={() => router.back()}
        onToggleFavorite={handleToggleFavorite}
      />
      <AirlineStatsGrid stats={stats} />
      <FlightSearch value={search} onChange={setSearch} />
      <FlightsSection flights={filtered} language={language} noDataLoading={aircraftMap.size === 0} />
    </div>
  );
}
