'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useStatsStore } from '@/lib/stores/statsStore';

const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex flex-col items-center justify-center gap-6 bg-[var(--bg)]">
        {/* Animated radar sweep */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/20" />
          <div className="absolute inset-3 rounded-full border border-[var(--primary)]/15" />
          <div className="absolute inset-6 rounded-full border border-[var(--primary)]/10" />
          <div className="absolute inset-0 rounded-full animate-radar origin-center"
            style={{ background: 'conic-gradient(from 0deg, transparent 0deg, var(--primary) 30deg, transparent 60deg)' , opacity: 0.3 }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse-glow" />
          </div>
        </div>
        <div className="text-center">
          <span className="neon-text font-[var(--font-heading)] font-bold tracking-wider text-2xl text-[var(--primary)] block">
            AIRWATCH
          </span>
          <p className="text-[var(--text-muted)] font-[var(--font-body)] text-xs mt-2 tracking-widest animate-pulse">
            INITIALIZING FLIGHT SYSTEMS...
          </p>
        </div>
      </div>
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
    /* Map page uses full viewport — dvh for mobile browser address bar */
    <div className="w-full fixed top-0 left-0 right-0 bottom-0 lg:pt-12">
      <MapView />
      <SquawkAlertBanner />
      <FlightDetailsPanel />
    </div>
  );
}
