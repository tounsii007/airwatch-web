'use client';

import { PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

export type TabType = 'departures' | 'arrivals';

interface Props {
  active: TabType;
  onChange: (tab: TabType) => void;
  language: AppLanguage;
}

/** Departures/Arrivals tab switcher — built on the SegmentedControl primitive. */
export function ScheduleTabs({ active, onChange, language }: Props) {
  const options: SegmentedOption<TabType>[] = [
    {
      value: 'departures',
      label: t('departures_tab', language),
      icon: <PlaneTakeoff size={14} />,
    },
    {
      value: 'arrivals',
      label: t('arrivals_tab', language),
      icon: <PlaneLanding size={14} />,
    },
  ];

  return (
    <SegmentedControl
      options={options}
      value={active}
      onChange={onChange}
      fullWidth
      size="md"
    />
  );
}
