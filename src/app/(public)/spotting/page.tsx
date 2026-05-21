'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useUserLocation } from '@/app/(public)/spotting/useUserLocation';
import { t } from '@/lib/i18n/translations';
import type { AircraftState } from '@/lib/types';
import { LocationBar } from '@/app/(public)/spotting/LocationBar';
import { SpottingList } from '@/app/(public)/spotting/SpottingList';
import { TierStatsRow } from '@/app/(public)/spotting/TierStatsRow';
import { buildSpottingEntries } from '@/app/(public)/spotting/buildEntries';
import { ArEntryButton } from '@/app/(public)/spotting/ArEntryButton';
import { PageContainer, FadeIn } from '@/components/ui';
import { Tag } from '@/components/ui/Tag';

const DEFAULT_RADIUS_KM = 500;

export default function SpottingPage() {
  const { aircraftMap, startPolling, selectAircraft } = useFlightStore();
  const { altitudeUnit, language } = useSettingsStore();
  const router = useRouter();

  const [maxRadius, setMaxRadius] = useState(DEFAULT_RADIUS_KM);
  const [geoRetry, setGeoRetry] = useState(0);
  const { userLat, userLon, geoError } = useUserLocation(language, geoRetry);

  useEffect(() => { if (aircraftMap.size === 0) startPolling(); }, [aircraftMap.size, startPolling]);

  const entries = useMemo(() => {
    if (userLat == null || userLon == null) return [];
    return buildSpottingEntries({ aircraftMap, userLat, userLon, maxRadius });
  }, [aircraftMap, maxRadius, userLat, userLon]);

  const handleTrack = (aircraft: AircraftState) => {
    selectAircraft(aircraft);
    router.push('/');
  };

  return (
    <PageContainer
      maxWidth="3xl"
      title={t('spotting', language)}
      subtitle={
        entries.length > 0 ? (
          <Tag variant="success" size="sm">{entries.length} aircraft nearby</Tag>
        ) : null
      }
    >
      <div className="space-y-4">
        <FadeIn>
          <ArEntryButton />
        </FadeIn>
        <FadeIn delay={60}>
          <LocationBar
            userLat={userLat}
            userLon={userLon}
            geoError={geoError}
            maxRadius={maxRadius}
            onRadiusChange={setMaxRadius}
            language={language}
          />
        </FadeIn>
        <FadeIn delay={120}>
          <TierStatsRow entries={entries} />
        </FadeIn>
        <FadeIn delay={180}>
          <SpottingList
            entries={entries}
            userLat={userLat}
            geoError={geoError}
            altitudeUnit={altitudeUnit}
            language={language}
            onTrack={handleTrack}
            onRetryGeo={() => setGeoRetry((n) => n + 1)}
          />
        </FadeIn>
      </div>
    </PageContainer>
  );
}
