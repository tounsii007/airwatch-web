'use client';

import { Plane, PlaneLanding, Route } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import type { AirlineStats } from '@/app/(public)/airlines/[icao]/airlineStats';

/** 3-cell stats grid for an airline: active / routes / ground. */
export function AirlineStatsGrid({ stats }: { stats: AirlineStats }) {
  const language = useSettingsStore((s) => s.language);
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label={t('airline_stat_active', language)}
        value={stats.active}
        status="success"
        icon={<Plane size={16} />}
      />
      <StatCard
        label={t('airline_stat_routes', language)}
        value={stats.routes}
        status="info"
        icon={<Route size={16} />}
      />
      <StatCard
        label={t('airline_stat_ground', language)}
        value={stats.ground}
        status="warning"
        icon={<PlaneLanding size={16} />}
      />
    </div>
  );
}
