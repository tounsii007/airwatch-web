'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import { MiniCell } from '@/components/flight/details/primitives';
import { formatHeading } from '@/components/flight/details/flightDisplayUtils';
import type { AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';

interface Props {
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  baroAltitude: number | undefined;
  velocity: number | undefined;
  trueTrack: number | undefined;
  altColor?: string;
  showMore: boolean;
  onToggleMore: () => void;
}

function ToggleCell({ showMore, onToggleMore, language }: { showMore: boolean; onToggleMore: () => void; language: AppLanguage }) {
  const Icon = showMore ? ChevronDown : ChevronUp;
  return (
    <button onClick={onToggleMore} className="glass-panel px-2 py-1.5 text-center hover:bg-white/5 cursor-pointer">
      <span className="text-[8px] font-[var(--font-heading)] text-[var(--primary)] tracking-wider block">
        {showMore ? t('less_label', language) : t('more_label', language)}
      </span>
      <Icon size={12} className="text-[var(--primary)] mx-auto" />
    </button>
  );
}

/** 4-column mini-cell grid on the mobile panel: alt / spd / hdg / more-toggle. */
export function MobileStatsGrid(props: Props) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
      <MiniCell label={t('alt_label', props.language)} value={formatAltitude(props.baroAltitude, props.altitudeUnit)} color={props.altColor} />
      <MiniCell label={t('spd_label', props.language)} value={formatSpeed(props.velocity, props.speedUnit)} />
      <MiniCell label={t('hdg_label', props.language)} value={formatHeading(props.trueTrack)} />
      <ToggleCell showMore={props.showMore} onToggleMore={props.onToggleMore} language={props.language} />
    </div>
  );
}
