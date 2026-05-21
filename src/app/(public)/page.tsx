'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useStatsStore } from '@/lib/stores/statsStore';
import { LoadingRadar } from '@/components/ui/LoadingRadar';

const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <LoadingRadar className="h-full bg-[var(--bg)]" />
    ),
  }
);

const FlightDetailsPanel = dynamic(
  () => import('@/components/flight/FlightDetailsPanel').then((m) => m.FlightDetailsPanel),
  { ssr: false }
);

const SquawkAlertBanner = dynamic(
  () => import('@/components/map/SquawkAlertBanner').then((m) => m.SquawkAlertBanner),
  { ssr: false }
);

export default function MapPage() {
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);
  const recordView = useStatsStore((s) => s.recordView);

  // Record every aircraft selection into personal stats
  useEffect(() => {
    if (selectedAircraft) {
      recordView(selectedAircraft);
    }
  }, [selectedAircraft, recordView]);

  return (
    /* Map page uses full viewport — dvh for mobile browser address bar.
       Top offset accommodates the mobile top-bar (44 px) and desktop
       header (48 px); bottom offset on mobile leaves room for the
       bottom navigation. */
    <div className="w-full fixed top-11 lg:top-12 left-0 right-0 bottom-16 lg:bottom-0">
      <MapView />
      <SquawkAlertBanner />
      <FlightDetailsPanel />
    </div>
  );
}
