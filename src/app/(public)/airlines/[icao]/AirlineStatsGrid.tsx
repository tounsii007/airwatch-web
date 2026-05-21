'use client';

import { Plane, PlaneLanding, Route } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import type { AirlineStats } from '@/app/(public)/airlines/[icao]/airlineStats';

/** 3-cell stats grid for an airline: active / routes / ground. */
export function AirlineStatsGrid({ stats }: { stats: AirlineStats }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label="ACTIVE"
        value={stats.active}
        status="success"
        icon={<Plane size={16} />}
      />
      <StatCard
        label="ROUTES"
        value={stats.routes}
        status="info"
        icon={<Route size={16} />}
      />
      <StatCard
        label="GROUND"
        value={stats.ground}
        status="warning"
        icon={<PlaneLanding size={16} />}
      />
    </div>
  );
}
