'use client';

import dynamic from 'next/dynamic';
import { CuboidIcon, Plane } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRadar } from '@/components/ui/LoadingRadar';
import type { FlightPosition, ReplayInfo } from '@/lib/flights/replay';

// deck.gl + OSM tiles need window + WebGL — disable SSR entirely.
const FlightReplay3D = dynamic(
  () => import('@/components/replay3d/FlightReplay3D').then((m) => m.FlightReplay3D),
  { ssr: false },
);

interface Props {
  selected: ReplayInfo | null;
  loading: boolean;
  positions: FlightPosition[];
}

/** Right-hand stage: shows the chosen replay or an instructional placeholder. */
export function ReplayStage({ selected, loading, positions }: Props) {
  if (!selected) {
    return (
      <GlassPanel className="p-4">
        <EmptyState
          icon={<CuboidIcon size={28} />}
          title="3D-Replay starten"
          body="Wähle einen Flug aus der Liste, um die 3D-Wiedergabe zu starten."
          variant="info"
          bare
          className="py-16"
        />
      </GlassPanel>
    );
  }
  if (loading) {
    return (
      <GlassPanel className="p-4">
        <div className="py-12">
          <LoadingRadar size={96} label="LOADING" hint="Track wird geladen" />
        </div>
      </GlassPanel>
    );
  }
  return (
    <GlassPanel className="p-0 overflow-hidden">
      <div className="px-4 py-2 border-b border-[var(--glass-border)] flex items-center gap-2">
        <Plane size={14} className="text-[var(--accent)]" />
        <span className="font-[var(--font-heading)] text-xs font-bold tracking-wider">
          {selected.callsign || selected.icao24}
        </span>
        <span className="ml-auto text-[10px] text-[var(--text-muted)]">{positions.length} positions</span>
      </div>
      <div className="relative w-full h-[540px]">
        <FlightReplay3D positions={positions} />
      </div>
    </GlassPanel>
  );
}
