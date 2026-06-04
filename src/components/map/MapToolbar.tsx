'use client';

/**
 * Top-right floating control cluster: the primary map controls that the
 * premium mockup groups together — a 3D button (routes to the CesiumJS
 * globe), the weather/radar toggle, the "Surface" basemap dropdown, plus
 * the retained center/locate and cargo filters.
 *
 * The zoom (+/−) and layers controls were split out into
 * {@link MapBottomBar} so they sit centred along the bottom edge; this
 * component now owns only the top cluster. {@link MapView} still owns the
 * source-of-truth booleans and handlers — each toggle here is controlled.
 *
 * The 3D entry is a real {@link Link} to `/globe` (no faked in-map 3D
 * state): it prefetches and client-navigates to the existing globe route,
 * styled to match a solid {@link IconButton} so the cluster reads as one
 * coherent strip.
 */
import Link from 'next/link';
import { CloudRain, Locate, Package } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { MapStylePicker } from '@/components/map/MapStylePicker';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage, MapStyle } from '@/lib/types';

interface Props {
  language: AppLanguage;
  mapStyle: MapStyle;
  onMapStyle: (next: MapStyle) => void;
  showRadar: boolean;
  radarShouldShow: boolean;
  onToggleRadar: () => void;
  cargoOnly: boolean;
  onToggleCargo: () => void;
  onCenter: () => void;
}

export function MapToolbar({
  language,
  mapStyle,
  onMapStyle,
  showRadar,
  radarShouldShow,
  onToggleRadar,
  cargoOnly,
  onToggleCargo,
  onCenter,
}: Props) {
  const radarIconCls = showRadar && !radarShouldShow
    ? 'text-[var(--info)] opacity-40'
    : showRadar
      ? 'text-[var(--info)]'
      : 'text-[var(--primary)]';

  return (
    <div
      className="absolute top-16 right-3 z-[1000] flex flex-col gap-1.5 animate-fade-in"
      style={{ animationDelay: '180ms' }}
      role="toolbar"
      aria-label={t('aria_map_controls', language)}
    >
      {/* 3D → the existing /globe route. Styled to match a solid IconButton
          (same glass chrome + 36px hit target) but is a real navigation
          link, not a toggle. The "3D" wordmark sits under a globe glyph so
          the affordance reads even before hover. */}
      <Link
        href="/globe"
        aria-label={t('nav_globe', language)}
        title={t('nav_globe', language)}
        className="w-9 h-9 inline-flex flex-col items-center justify-center rounded-lg transition-all duration-150 ease-out glass-panel bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--surface-light)] hover:border-[var(--glass-border-strong)] active:scale-95"
      >
        <span className="t-mono text-[11px] font-bold leading-none tracking-wider text-[var(--primary)]">
          3D
        </span>
      </Link>

      <IconButton
        aria-label={showRadar ? 'Hide weather radar' : 'Show weather radar'}
        onClick={onToggleRadar}
        variant="solid"
        size="md"
        active={showRadar}
        tone="info"
        className="glass-panel"
      >
        <CloudRain size={18} className={radarIconCls} aria-hidden="true" />
      </IconButton>

      <MapStylePicker mapStyle={mapStyle} onChange={onMapStyle} />

      <IconButton aria-label={t('aria_reset_view', language)} onClick={onCenter} variant="solid" size="md" className="glass-panel">
        <Locate size={18} className="text-[var(--primary)]" aria-hidden="true" />
      </IconButton>

      <IconButton
        aria-label={cargoOnly ? t('cargo_only_off', language) : t('cargo_only_on', language)}
        title={cargoOnly ? t('cargo_only_off', language) : t('cargo_only_on', language)}
        onClick={onToggleCargo}
        variant="solid"
        size="md"
        active={cargoOnly}
        tone="accent"
        className="glass-panel"
      >
        <Package size={18} className={cargoOnly ? 'text-[var(--accent)]' : 'text-[var(--primary)]'} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
