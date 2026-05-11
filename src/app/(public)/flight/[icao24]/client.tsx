'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useStatsStore } from '@/lib/stores/statsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

const MapView = dynamic(() => import('@/components/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="h-full flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <span className="neon-text font-[var(--font-heading)] font-bold tracking-wider text-2xl text-[var(--primary)]">AIRWATCH</span>
      <p className="text-[var(--text-muted)] text-sm animate-pulse">Loading flight...</p>
    </div>
  ),
});
const FlightDetailsPanel = dynamic(() => import('@/components/flight/FlightDetailsPanel').then((m) => m.FlightDetailsPanel), { ssr: false });
const SquawkAlertBanner = dynamic(() => import('@/components/map/SquawkAlertBanner').then((m) => m.SquawkAlertBanner), { ssr: false });

export default function FlightDeepLinkPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawIcao24 = params.icao24 as string;
  const icao24 = rawIcao24.toLowerCase();

  // ICAO24 transponder address: exactly 6 hex characters
  const isValid = /^[0-9a-f]{6}$/.test(icao24);

  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const startPolling = useFlightStore((s) => s.startPolling);
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);
  const recordView = useStatsStore((s) => s.recordView);
  const language = useSettingsStore((s) => s.language);

  // Start polling if no data
  useEffect(() => {
    if (aircraftMap.size === 0) startPolling();
  }, [aircraftMap.size, startPolling]);

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
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--error)]"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h1 className="neon-text font-[var(--font-heading)] text-lg font-bold text-[var(--primary)]">{t('page_not_found', language)}</h1>
        <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)] max-w-sm">
          {t('invalid_icao24_address', language).replace('{0}', rawIcao24)}
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] text-sm font-[var(--font-heading)] font-bold hover:bg-[var(--primary)]/25 transition-colors"
        >
          {t('back_to_map', language)}
        </Link>
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
