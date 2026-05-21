'use client';

/**
 * Right-edge floating toolbar with zoom / center / radar / cargo /
 * style / legend controls. Pulled out of {@link MapView} so the host
 * component stays focused on map orchestration rather than UI plumbing.
 *
 * Each toggle (radar / cargo / legend) is a controlled boolean — the
 * parent owns the source of truth so the same store reads can drive
 * both the toolbar and the underlying layer hooks.
 */
import { CloudRain, Info, Locate, Package, ZoomIn, ZoomOut } from 'lucide-react';
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
  showLegend: boolean;
  onToggleLegend: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
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
  showLegend,
  onToggleLegend,
  onZoomIn,
  onZoomOut,
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
      aria-label="Map controls"
    >
      <IconButton aria-label="Zoom in" onClick={onZoomIn} variant="solid" size="md" className="glass-panel">
        <ZoomIn size={18} className="text-[var(--primary)]" aria-hidden="true" />
      </IconButton>
      <IconButton aria-label="Zoom out" onClick={onZoomOut} variant="solid" size="md" className="glass-panel">
        <ZoomOut size={18} className="text-[var(--primary)]" aria-hidden="true" />
      </IconButton>
      <IconButton aria-label="Reset view to default location" onClick={onCenter} variant="solid" size="md" className="glass-panel">
        <Locate size={18} className="text-[var(--primary)]" aria-hidden="true" />
      </IconButton>
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
      <MapStylePicker mapStyle={mapStyle} onChange={onMapStyle} />
      <IconButton
        aria-label={showLegend ? 'Hide legend' : 'Show legend'}
        onClick={onToggleLegend}
        variant="solid"
        size="md"
        active={showLegend}
        tone="primary"
        className="glass-panel lg:hidden"
      >
        <Info size={18} className="text-[var(--primary)]" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
