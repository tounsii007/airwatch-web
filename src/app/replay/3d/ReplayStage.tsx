'use client';

import dynamic from 'next/dynamic';
import { GlassPanel } from '@/components/ui/GlassPanel';
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

function Placeholder({ text }: { text: string }) {
  return <div className="py-20 text-center text-xs text-[var(--text-muted)]">{text}</div>;
}

/** Right-hand stage: shows the chosen replay or an instructional placeholder. */
export function ReplayStage({ selected, loading, positions }: Props) {
  if (!selected) {
    return (
      <GlassPanel className="p-4">
        <Placeholder text="Wähle einen Flug in der Liste, um das 3D-Replay zu starten." />
      </GlassPanel>
    );
  }
  if (loading) {
    return (
      <GlassPanel className="p-4">
        <Placeholder text="Track wird geladen…" />
      </GlassPanel>
    );
  }
  return (
    <GlassPanel className="p-0 overflow-hidden">
      <div className="relative w-full h-[580px]">
        <FlightReplay3D positions={positions} />
      </div>
    </GlassPanel>
  );
}
