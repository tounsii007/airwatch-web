'use client';

import { Plane, PlaneLanding, Radio } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { AirborneStats } from '@/app/(public)/airports/airportsStats';

/** 3-cell stats row on /airports — airborne / ground / total. */
export function StatsRow({ stats, language }: { stats: AirborneStats; language: AppLanguage }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label={t('airborne', language)}
        value={stats.airborne}
        status="success"
        icon={<Plane size={18} />}
      />
      <StatCard
        label={t('on_ground', language)}
        value={stats.ground}
        status="warning"
        icon={<PlaneLanding size={18} />}
      />
      <StatCard
        label={t('total', language)}
        value={stats.total}
        status="default"
        icon={<Radio size={18} />}
      />
    </div>
  );
}
