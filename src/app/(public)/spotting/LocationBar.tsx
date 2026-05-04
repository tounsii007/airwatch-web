'use client';

import { Crosshair } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import { RADIUS_OPTIONS } from '@/app/(public)/spotting/spottingTypes';

interface Props {
  userLat: number | null;
  userLon: number | null;
  geoError: string | null;
  maxRadius: number;
  onRadiusChange: (radius: number) => void;
  language: AppLanguage;
}

function LocationText({ userLat, userLon, geoError, language }: Pick<Props, 'userLat' | 'userLon' | 'geoError' | 'language'>) {
  if (userLat != null) {
    return (
      <span className="text-xs font-[var(--font-body)] text-[var(--text-secondary)]">
        {userLat.toFixed(2)}°, {userLon?.toFixed(2)}°
      </span>
    );
  }
  return (
    <span className="text-xs font-[var(--font-body)] text-[var(--text-muted)]">
      {geoError ?? t('loading', language)}
    </span>
  );
}

function RadiusChip({ value, active, onClick }: { value: number; active: boolean; onClick: () => void }) {
  const cls = active
    ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
    : 'text-[var(--text-muted)] border border-transparent';
  return (
    <button onClick={onClick} className={`px-2 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider transition-colors cursor-pointer ${cls}`}>
      {value}km
    </button>
  );
}

/** Location readout + radius-chip selector. */
export function LocationBar(props: Props) {
  return (
    <GlassPanel className="p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Crosshair size={14} className="text-[var(--primary)]" />
        <LocationText userLat={props.userLat} userLon={props.userLon} geoError={props.geoError} language={props.language} />
      </div>
      <div className="flex items-center gap-1">
        {RADIUS_OPTIONS.map((r) => (
          <RadiusChip key={r} value={r} active={props.maxRadius === r} onClick={() => props.onRadiusChange(r)} />
        ))}
      </div>
    </GlassPanel>
  );
}
