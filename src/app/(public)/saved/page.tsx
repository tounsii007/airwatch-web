'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pin } from 'lucide-react';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { BackToTop } from '@/app/(public)/saved/BackToTop';
import { EmptyState } from '@/app/(public)/saved/EmptyState';
import { SavedCard } from '@/app/(public)/saved/SavedCard';
import { Section } from '@/app/(public)/saved/Section';
import { useSavedGroups } from '@/app/(public)/saved/useSavedGroups';
import type { AircraftState, FavoriteItem } from '@/lib/types';
import { PageContainer, FadeIn, Stagger } from '@/components/ui';

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
    <div key={item.id} className="animate-fade-up">
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
    <PageContainer
      maxWidth="2xl"
      title={t('saved', language)}
      subtitle={
        items.length > 0 ? (
          <span className="badge badge-info">{items.length} items</span>
        ) : null
      }
    >
      {items.length === 0 ? (
        <FadeIn>
          <EmptyState language={language} />
        </FadeIn>
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <FadeIn>
              <Section title={`PINNED (${pinned.length})`} icon={<Pin size={10} />} accent="warning">
                <Stagger>{pinned.map(renderItem)}</Stagger>
              </Section>
            </FadeIn>
          )}
          {flights.length > 0 && (
            <FadeIn delay={50}>
              <Section title={`${t('flights_upper', language)} (${flights.length})`}>
                <Stagger>{flights.map(renderItem)}</Stagger>
              </Section>
            </FadeIn>
          )}
          {airports.length > 0 && (
            <FadeIn delay={100}>
              <Section title={`${t('airports', language)} (${airports.length})`}>
                <Stagger>{airports.map(renderItem)}</Stagger>
              </Section>
            </FadeIn>
          )}
          {airlines.length > 0 && (
            <FadeIn delay={150}>
              <Section title={`${t('airlines', language)} (${airlines.length})`}>
                <Stagger>{airlines.map(renderItem)}</Stagger>
              </Section>
            </FadeIn>
          )}
          {items.length > 5 && <BackToTop />}
        </div>
      )}
    </PageContainer>
  );
}
