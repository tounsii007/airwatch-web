'use client';

/**
 * Bottom-center floating cluster for the radar map.
 *
 * Holds the zoom in / out (+ / −) controls with a small live zoom-level
 * readout sandwiched between them, plus a "layers" button that toggles the
 * altitude legend. Pulled out of {@link MapToolbar} so the primary controls
 * (style / radar / 3D) read as a tidy top cluster while the navigation
 * controls sit centred along the bottom edge — matching the premium mockup.
 *
 * All chrome reuses the shared {@link IconButton} + `glass-panel` tokens so
 * it stays visually coherent with the rest of the map surface; nothing is
 * hard-coded here.
 */
import { Layers, Minus, Plus } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  language: AppLanguage;
  /** Current Leaflet zoom level — rendered as the readout between +/−. */
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Layers / legend visibility — the bottom "layers" button lights up
   *  while the legend is shown. */
  showLegend: boolean;
  onToggleLegend: () => void;
}

export function MapBottomBar({
  language,
  zoom,
  onZoomIn,
  onZoomOut,
  showLegend,
  onToggleLegend,
}: Props) {
  return (
    <div
      className="absolute bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 animate-fade-in"
      style={{ animationDelay: '220ms' }}
      role="toolbar"
      aria-label={t('aria_map_controls', language)}
    >
      {/* Zoom pill: − · level · + grouped in a single glass capsule. */}
      <div className="glass-panel flex items-center gap-1 px-1.5 py-1 rounded-full">
        <IconButton
          aria-label={t('aria_zoom_out', language)}
          onClick={onZoomOut}
          variant="ghost"
          size="md"
        >
          <Minus size={18} className="text-[var(--primary)]" aria-hidden="true" />
        </IconButton>

        {/* Live zoom-level readout. tabular-nums keeps the width steady as
            the digit changes so the +/− buttons don't shuffle. */}
        <span
          className="t-data t-label min-w-[2ch] text-center font-semibold text-[var(--text-secondary)] tabular-nums"
          aria-live="polite"
          aria-label={`Zoom level ${Math.round(zoom)}`}
        >
          {Math.round(zoom)}
        </span>

        <IconButton
          aria-label={t('aria_zoom_in', language)}
          onClick={onZoomIn}
          variant="ghost"
          size="md"
        >
          <Plus size={18} className="text-[var(--primary)]" aria-hidden="true" />
        </IconButton>
      </div>

      {/* Layers button — toggles the altitude legend overlay. */}
      <IconButton
        aria-label={showLegend ? 'Hide legend' : 'Show legend'}
        title={showLegend ? 'Hide legend' : 'Show legend'}
        onClick={onToggleLegend}
        variant="solid"
        size="md"
        active={showLegend}
        tone="primary"
        className="glass-panel"
      >
        <Layers size={18} className="text-[var(--primary)]" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
