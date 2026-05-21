'use client';

/**
 * Altitude legend pinned at the bottom-right of the map. Keys the
 * coloured dots to the active map style so swapping `mapStyle` updates
 * the legend palette in sync.
 */
import { MAP_STYLES } from '@/components/map/mapStyles';
import type { MapStyle } from '@/lib/types';

interface LegendRowProps {
  color: string;
  label: string;
}

function LegendRow({ color, label }: LegendRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </div>
  );
}

export function MapLegend({ mapStyle }: { mapStyle: MapStyle }) {
  const c = MAP_STYLES[mapStyle].colors;
  return (
    <div className="absolute bottom-14 lg:bottom-4 right-3 z-[1000] glass-panel px-3 py-2 rounded-lg">
      <div
        className="flex flex-col gap-1.5 text-[9px] font-[var(--font-heading)] tracking-wider"
        role="list"
        aria-label="Altitude legend"
      >
        <LegendRow color={c.low}    label="LOW <10k ft" />
        <LegendRow color={c.med}    label="MED 10-30k ft" />
        <LegendRow color={c.high}   label="HIGH >30k ft" />
        <LegendRow color={c.ground} label="GROUND" />
      </div>
    </div>
  );
}
