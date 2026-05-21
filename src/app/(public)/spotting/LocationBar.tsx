'use client';

import { Crosshair } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl';
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
      <span className="text-xs font-[var(--font-body)] text-[var(--text-secondary)] tabular">
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

/** Location readout + radius segmented selector. */
export function LocationBar(props: Props) {
  const radiusOptions: SegmentedOption<string>[] = RADIUS_OPTIONS.map((r) => ({
    value: String(r),
    label: `${r}km`,
  }));

  return (
    <GlassPanel className="p-3 flex items-center justify-between gap-3 rounded-xl">
      <div className="flex items-center gap-2 min-w-0">
        <Crosshair size={14} className="text-[var(--primary)] shrink-0" aria-hidden />
        <LocationText userLat={props.userLat} userLon={props.userLon} geoError={props.geoError} language={props.language} />
      </div>
      <SegmentedControl
        options={radiusOptions}
        value={String(props.maxRadius)}
        onChange={(v) => props.onRadiusChange(Number(v))}
        size="sm"
      />
    </GlassPanel>
  );
}
