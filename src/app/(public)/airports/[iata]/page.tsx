'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMounted } from '@/lib/hooks/useMounted';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { toast } from '@/components/ui/toast';
import { AirportHeader } from '@/app/(public)/airports/[iata]/AirportHeader';
import { ClockPanel } from '@/app/(public)/airports/[iata]/ClockPanel';
import { ScheduleList, type SortBy } from '@/app/(public)/airports/[iata]/ScheduleList';
import { ScheduleTabs, type TabType } from '@/app/(public)/airports/[iata]/ScheduleTabs';
import { WeatherPanel } from '@/app/(public)/airports/[iata]/WeatherPanel';
import { AtcAudioPanel } from '@/app/(public)/airports/[iata]/AtcAudioPanel';
import { MetarPanel } from '@/app/(public)/airports/[iata]/MetarPanel';
import { NotamPanel } from '@/app/(public)/airports/[iata]/NotamPanel';
import { WikiPanel } from '@/components/airlabs/WikiPanel';
import { useAirportClock } from '@/app/(public)/airports/[iata]/useAirportClock';
import { useAirportDetail } from '@/app/(public)/airports/[iata]/useAirportDetail';
import type { AirportScheduleFlight } from '@/lib/types';

function delayOf(f: AirportScheduleFlight, tab: TabType): number {
  return (tab === 'departures' ? f.depDelayed : f.arrDelayed) ?? 0;
}

function sortFlights(raw: AirportScheduleFlight[], sortBy: SortBy, tab: TabType): AirportScheduleFlight[] {
  if (sortBy !== 'delay') return raw;
  return [...raw].sort((a, b) => delayOf(b, tab) - delayOf(a, tab));
}

export default function AirportDetailPage() {
  const params = useParams();
  const iata = (params.iata as string).toUpperCase();
  const { language } = useSettingsStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const { airport, weather, utcOffsetSec, departures, arrivals, loading } = useAirportDetail(iata);
  const [activeTab, setActiveTab] = useState<TabType>('departures');
  const [sortBy, setSortBy] = useState<SortBy>('time');
  const clock = useAirportClock(airport?.lon, utcOffsetSec);

  const flights = useMemo(
    () => sortFlights(activeTab === 'departures' ? departures : arrivals, sortBy, activeTab),
    [departures, arrivals, activeTab, sortBy],
  );

  const handleFavorite = useCallback(() => {
    const wasSaved = isFavorite(`airport-${iata}`);
    toggleFavorite({
      id: `airport-${iata}`,
      type: 'airport',
      label: iata,
      subtitle: airport?.name ?? '',
      addedAt: Date.now(),
    });
    const name = airport?.name ?? iata;
    if (wasSaved) {
      toast({ title: `Removed "${name}"`, variant: 'default', duration: 3000 });
    } else {
      toast.success({ title: `Saved "${name}"`, duration: 3000 });
    }
  }, [iata, airport, isFavorite, toggleFavorite]);

  const mounted = useMounted();
  const saved = mounted && isFavorite(`airport-${iata}`);

  return (
    <div className="p-4 space-y-4">
      <AirportHeader iata={iata} airport={airport} language={language} saved={saved} onToggleFavorite={handleFavorite} />
      <div className="grid grid-cols-2 gap-2">
        <WeatherPanel weather={weather} language={language} />
        <ClockPanel clock={clock} language={language} />
      </div>
      <MetarPanel icao={airport?.icao ?? null} language={language} />
      <NotamPanel icao={airport?.icao ?? null} language={language} />
      <AtcAudioPanel icao={airport?.icao ?? null} language={language} />
      <WikiPanel airportIata={iata} />
      <ScheduleTabs active={activeTab} onChange={setActiveTab} language={language} />
      <ScheduleList
        flights={flights}
        loading={loading}
        tab={activeTab}
        language={language}
        sortBy={sortBy}
        onToggleSort={() => setSortBy((s) => (s === 'time' ? 'delay' : 'time'))}
      />
    </div>
  );
}
