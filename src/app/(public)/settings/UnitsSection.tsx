'use client';

import { Gauge, MountainSnow, Ruler } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl';
import { LabeledBlock, SectionPanel } from '@/app/(public)/settings/SectionPanel';
import type { AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';

interface Props {
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  language: AppLanguage;
  onAltitude: (u: AltitudeUnit) => void;
  onSpeed: (u: SpeedUnit) => void;
}

function altitudeOptions(language: AppLanguage): SegmentedOption<AltitudeUnit>[] {
  return [
    { value: 'feet',   label: t('unit_feet', language) },
    { value: 'meters', label: t('unit_meters', language) },
  ];
}

function speedOptions(language: AppLanguage): SegmentedOption<SpeedUnit>[] {
  return [
    { value: 'knots', label: t('unit_knots', language) },
    { value: 'kmh',   label: t('unit_kmh', language) },
    { value: 'mph',   label: t('unit_mph', language) },
  ];
}

/** Units section: altitude + speed. */
export function UnitsSection({ altitudeUnit, speedUnit, language, onAltitude, onSpeed }: Props) {
  return (
    <SectionPanel icon={<Ruler size={12} />} title={t('units', language)}>
      <div className="space-y-1">
        <LabeledBlock label={<><MountainSnow size={12} />{t('altitude_short', language)}</>}>
          <SegmentedControl
            options={altitudeOptions(language)}
            value={altitudeUnit}
            onChange={onAltitude}
            fullWidth
            size="sm"
          />
        </LabeledBlock>
        <div className="border-t border-[var(--glass-border)]" />
        <LabeledBlock label={<><Gauge size={12} />{t('speed_short', language)}</>}>
          <SegmentedControl
            options={speedOptions(language)}
            value={speedUnit}
            onChange={onSpeed}
            fullWidth
            size="sm"
          />
        </LabeledBlock>
      </div>
    </SectionPanel>
  );
}
