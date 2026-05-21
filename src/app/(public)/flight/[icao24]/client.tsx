'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useEnsurePolling } from '@/lib/hooks/useEnsurePolling';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useStatsStore } from '@/lib/stores/statsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { LoadingRadar } from '@/components/ui/LoadingRadar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n/translations';

function MapLoadingFallback() {
  const language = useSettingsStore((s) => s.language);
  return (
    <LoadingRadar
      size={96}
      label={t('loading_radar_default_label', language)}
      hint={t('replay_loading_track', language)}
      className="h-full bg-[var(--bg)]"
    />
  );
}

const MapView = dynamic(() => import('@/components/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});
const FlightDetailsPanel = dynamic(() => import('@/components/flight/FlightDetailsPanel').then((m) => m.FlightDetailsPanel), { ssr: false });
const SquawkAlertBanner = dynamic(() => import('@/components/map/SquawkAlertBanner').then((m) => m.SquawkAlertBanner), { ssr: false });

export default function FlightDeepLinkPage() {
  const params = useParams();
  const rawIcao24 = params.icao24 as string;
  const icao24 = rawIcao24.toLowerCase();

  // ICAO24 transponder address: exactly 6 hex characters
  const isValid = /^[0-9a-f]{6}$/.test(icao24);

  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);
  const recordView = useStatsStore((s) => s.recordView);
  const language = useSettingsStore((s) => s.language);

  // Start polling if no data
  useEnsurePolling();

  // Auto-select the aircraft when data is available
  useEffect(() => {
    if (selectedAircraft?.icao24 === icao24) return;
    const aircraft = aircraftMap.get(icao24);
    if (aircraft) {
      selectAircraft(aircraft);
      recordView(aircraft);
    }
  }, [aircraftMap, icao24, selectAircraft, selectedAircraft, recordView]);

  if (!isValid) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title={t('page_not_found', language)}
          body={t('invalid_icao24_address', language).replace('{0}', rawIcao24)}
          variant="error"
          action={
            <Link href="/">
              <Button variant="primary" size="sm" leadingIcon={<ArrowLeft size={12} />}>
                {t('back_to_map', language)}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full fixed top-0 left-0 right-0 bottom-0 lg:pt-12">
      <MapView />
      <SquawkAlertBanner />
      <FlightDetailsPanel />
    </div>
  );
}
