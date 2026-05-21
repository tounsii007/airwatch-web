'use client';

import { BarChart2, Building2, Plane } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  totalViews: number;
  uniqueAirlines: number;
  uniqueAirports: number;
  language: AppLanguage;
}

/** 3-cell summary row on /stats. */
export function SummaryRow({ totalViews, uniqueAirlines, uniqueAirports, language }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label={t('total_viewed', language)}
        value={totalViews}
        status="default"
        icon={<Plane size={16} />}
      />
      <StatCard
        label={t('unique_airlines', language)}
        value={uniqueAirlines}
        status="info"
        icon={<BarChart2 size={16} />}
      />
      <StatCard
        label={t('unique_airports', language)}
        value={uniqueAirports}
        status="success"
        icon={<Building2 size={16} />}
      />
    </div>
  );
}
