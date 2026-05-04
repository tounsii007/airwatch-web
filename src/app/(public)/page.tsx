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
      <div className="h-full flex flex-col items-center justify-center gap-8 bg-[var(--bg)] animate-fade-in">
        {/* Multi-ring radar with sweep + breathing center pulse */}
        <div className="relative w-32 h-32">
          {/* Three concentric rings of decreasing strength */}
          <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/25" />
          <div className="absolute inset-4 rounded-full border border-[var(--primary)]/20" />
          <div className="absolute inset-8 rounded-full border border-[var(--primary)]/15" />

          {/* Outer pulse-ring — expands and fades, gives a lively "ping" */}
          <div
            className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/40"
            style={{ animation: 'ring-pulse 2.4s ease-out infinite' }}
          />

          {/* Sweep cone — rotates over the rings */}
          <div
            className="absolute inset-0 rounded-full animate-radar origin-center"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, var(--primary-bright) 45deg, transparent 90deg)',
              opacity: 0.4,
            }}
          />

          {/* Centre dot — breathing glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-3 h-3 rounded-full bg-[var(--primary-bright)] animate-pulse-glow"
              style={{ boxShadow: '0 0 12px var(--primary-bright)' }}
            />
          </div>
        </div>

        <div className="text-center animate-fade-up" style={{ animationDelay: '120ms' }}>
          <span className="gradient-text font-[var(--font-heading)] font-bold tracking-[0.25em] text-3xl block">
            AIRWATCH
          </span>
          <p className="text-[var(--text-muted)] font-[var(--font-body)] text-[10px] mt-3 tracking-[0.4em] uppercase">
            <span className="animate-pulse-glow inline-block">INITIALIZING FLIGHT SYSTEMS</span>
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
