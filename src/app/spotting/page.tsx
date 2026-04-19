'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NeonText } from '@/components/ui/NeonText';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useUserLocation } from '@/app/spotting/useUserLocation';
import { t } from '@/lib/i18n/translations';
import type { AircraftState } from '@/lib/types';
import { LocationBar } from '@/app/spotting/LocationBar';
import { SpottingList } from '@/app/spotting/SpottingList';
import { TierStatsRow } from '@/app/spotting/TierStatsRow';
import { buildSpottingEntries } from '@/app/spotting/buildEntries';
import { ArEntryButton } from '@/app/spotting/ArEntryButton';

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
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('spotting', language)} size="text-xl" />
      </div>
      <ArEntryButton />
      <LocationBar
        userLat={userLat}
        userLon={userLon}
        geoError={geoError}
        maxRadius={maxRadius}
        onRadiusChange={setMaxRadius}
        language={language}
      />
      <TierStatsRow entries={entries} />
      <SpottingList
        entries={entries}
        userLat={userLat}
        geoError={geoError}
        altitudeUnit={altitudeUnit}
        language={language}
        onTrack={handleTrack}
        onRetryGeo={() => setGeoRetry((n) => n + 1)}
      />
    </div>
  );
}
