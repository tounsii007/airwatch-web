'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pin } from 'lucide-react';
import { NeonText } from '@/components/ui/NeonText';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { BackToTop } from '@/app/saved/BackToTop';
import { EmptyState } from '@/app/saved/EmptyState';
import { SavedCard } from '@/app/saved/SavedCard';
import { Section } from '@/app/saved/Section';
import { useSavedGroups } from '@/app/saved/useSavedGroups';
import type { AircraftState, FavoriteItem } from '@/lib/types';

export default function SavedPage() {
  const { items, removeFavorite, togglePin } = useFavoritesStore();
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const startPolling = useFlightStore((s) => s.startPolling);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const language = useSettingsStore((s) => s.language);
  const altitudeUnit = useSettingsStore((s) => s.altitudeUnit);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const router = useRouter();

  useEffect(() => {
    if (aircraftMap.size === 0) startPolling();
  }, [aircraftMap.size, startPolling]);

  const { pinned, flights, airports, airlines } = useSavedGroups(items);

  const liveOf = (item: FavoriteItem): AircraftState | undefined => aircraftMap.get(item.id);

  const handleTrack = (item: FavoriteItem) => {
    const live = liveOf(item);
    if (!live) return;
    selectAircraft(live);
    router.push('/');
  };

  const renderItem = (item: FavoriteItem) => (
    <div key={item.id}>
      <SavedCard
        item={item}
        liveData={liveOf(item)}
        language={language}
        altitudeUnit={altitudeUnit}
        speedUnit={speedUnit}
        onRemove={() => removeFavorite(item.id)}
        onPin={() => togglePin(item.id)}
        onTrack={() => handleTrack(item)}
      />
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('saved', language)} size="text-xl" />
      </div>

      {items.length === 0 ? (
        <EmptyState language={language} />
      ) : (
        <>
          {pinned.length > 0 && (
            <Section title={`PINNED (${pinned.length})`} icon={<Pin size={10} />} accent="warning">
              {pinned.map(renderItem)}
            </Section>
          )}
          {flights.length > 0 && (
            <Section title={`${t('flights_upper', language)} (${flights.length})`}>{flights.map(renderItem)}</Section>
          )}
          {airports.length > 0 && (
            <Section title={`${t('airports', language)} (${airports.length})`}>{airports.map(renderItem)}</Section>
          )}
          {airlines.length > 0 && (
            <Section title={`${t('airlines', language)} (${airlines.length})`}>{airlines.map(renderItem)}</Section>
          )}
          {items.length > 5 && <BackToTop />}
        </>
      )}
    </div>
  );
}
