'use client';

import { Gauge, MountainSnow, Ruler } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { ChipGroup, type ChipOption } from '@/app/(public)/settings/ChipGroup';
import { LabeledBlock, SectionPanel } from '@/app/(public)/settings/SectionPanel';
import type { AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';

interface Props {
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  language: AppLanguage;
  onAltitude: (u: AltitudeUnit) => void;
  onSpeed: (u: SpeedUnit) => void;
}

function altitudeOptions(language: AppLanguage): ChipOption<AltitudeUnit>[] {
  return [
    { value: 'feet', label: t('unit_feet', language) },
    { value: 'meters', label: t('unit_meters', language) },
  ];
}

function speedOptions(language: AppLanguage): ChipOption<SpeedUnit>[] {
  return [
    { value: 'knots', label: t('unit_knots', language) },
    { value: 'kmh', label: t('unit_kmh', language) },
    { value: 'mph', label: t('unit_mph', language) },
  ];
}

/** Units section: altitude + speed. */
export function UnitsSection({ altitudeUnit, speedUnit, language, onAltitude, onSpeed }: Props) {
  return (
    <SectionPanel icon={<Ruler size={12} />} title={t('units', language)}>
      <div className="space-y-1">
        <LabeledBlock label={<><MountainSnow size={12} />{t('altitude_short', language)}</>}>
          <ChipGroup options={altitudeOptions(language)} value={altitudeUnit} onChange={onAltitude} />
        </LabeledBlock>
        <div className="border-t border-[var(--glass-border)]" />
        <LabeledBlock label={<><Gauge size={12} />{t('speed_short', language)}</>}>
          <ChipGroup options={speedOptions(language)} value={speedUnit} onChange={onSpeed} />
        </LabeledBlock>
      </div>
    </SectionPanel>
  );
}
