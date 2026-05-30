'use client';

/**
 * Altitude legend pinned at the bottom-right of the map. Keys the
 * coloured dots to the active map style so swapping `mapStyle` updates
 * the legend palette in sync.
 */
import { MAP_STYLES } from '@/components/map/mapStyles';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import type { MapStyle } from '@/lib/types';

interface LegendRowProps {
  color: string;
  label: string;
}

function LegendRow({ color, label }: LegendRowProps) {
  return (
    <div className="flex items-center gap-2" role="listitem">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </div>
  );
}

export function MapLegend({ mapStyle }: { mapStyle: MapStyle }) {
  const c = MAP_STYLES[mapStyle].colors;
  const language = useSettingsStore((s) => s.language);
  return (
    <div className="absolute bottom-14 lg:bottom-4 right-3 z-[1000] glass-panel px-3 py-2 rounded-lg">
      <div
        className="flex flex-col gap-1.5 text-[9px] font-[var(--font-heading)] tracking-wider"
        role="list"
        aria-label={t('aria_altitude_legend', language)}
      >
        <LegendRow color={c.low}    label={t('legend_alt_low', language)} />
        <LegendRow color={c.med}    label={t('legend_alt_med', language)} />
        <LegendRow color={c.high}   label={t('legend_alt_high', language)} />
        <LegendRow color={c.ground} label={t('legend_alt_ground', language)} />
      </div>
    </div>
  );
}
