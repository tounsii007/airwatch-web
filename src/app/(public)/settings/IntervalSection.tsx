'use client';

import { RefreshCw } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl';
import { SectionPanel } from '@/app/(public)/settings/SectionPanel';
import type { AppLanguage } from '@/lib/types';

interface Props {
  updateInterval: number;
  language: AppLanguage;
  onChange: (seconds: number) => void;
}

const INTERVAL_SECS = ['60', '180', '300', '600'] as const;
const MINUTE_VALUE: Record<typeof INTERVAL_SECS[number], number> = { '60': 1, '180': 3, '300': 5, '600': 10 };

function optionsFor(language: AppLanguage): SegmentedOption<string>[] {
  return INTERVAL_SECS.map((v) => ({
    value: v,
    label: `${MINUTE_VALUE[v]} ${t('interval_min', language)}`,
  }));
}

/** Update-interval segmented control (1 / 3 / 5 / 10 min). */
export function IntervalSection({ updateInterval, language, onChange }: Props) {
  return (
    <SectionPanel icon={<RefreshCw size={12} />} title={t('update_interval', language)}>
      <div className="py-2">
        <SegmentedControl
          options={optionsFor(language)}
          value={String(updateInterval)}
          onChange={(v) => onChange(Number(v))}
          fullWidth
          size="sm"
        />
      </div>
    </SectionPanel>
  );
}
