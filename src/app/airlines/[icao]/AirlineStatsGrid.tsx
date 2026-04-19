'use client';

import { ReactNode } from 'react';
import { Plane, PlaneLanding, Route } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type { AirlineStats } from '@/app/airlines/[icao]/airlineStats';

function StatCell({ icon, value, label, color }: { icon: ReactNode; value: number; label: string; color: string }) {
  return (
    <GlassPanel className="p-3 text-center">
      {icon}
      <div className="text-lg font-[var(--font-heading)] font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">{label}</div>
    </GlassPanel>
  );
}

/** 3-cell stats grid for an airline: active / routes / ground. */
export function AirlineStatsGrid({ stats }: { stats: AirlineStats }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCell
        icon={<Plane size={16} className="mx-auto mb-1 text-[var(--success)]" />}
        value={stats.active}
        label="ACTIVE"
        color="var(--success)"
      />
      <StatCell
        icon={<Route size={16} className="mx-auto mb-1 text-[var(--info)]" />}
        value={stats.routes}
        label="ROUTES"
        color="var(--info)"
      />
      <StatCell
        icon={<PlaneLanding size={16} className="mx-auto mb-1 text-[var(--ground)]" />}
        value={stats.ground}
        label="GROUND"
        color="var(--ground)"
      />
    </div>
  );
}
