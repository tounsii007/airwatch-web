'use client';

import { ReactNode } from 'react';
import { Plane, PlaneLanding, Radio } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { AirborneStats } from '@/app/(public)/airports/airportsStats';

function StatCell({ icon, value, label, color }: { icon: ReactNode; value: number; label: string; color: string }) {
  return (
    <GlassPanel className="p-3 text-center">
      {icon}
      <div className="text-lg font-[var(--font-heading)] font-bold" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">{label}</div>
    </GlassPanel>
  );
}

/** 3-cell stats row on /airports — airborne / ground / total. */
export function StatsRow({ stats, language }: { stats: AirborneStats; language: AppLanguage }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCell
        icon={<Plane size={18} className="mx-auto mb-1 text-[var(--success)]" />}
        value={stats.airborne} label={t('airborne', language)} color="var(--success)"
      />
      <StatCell
        icon={<PlaneLanding size={18} className="mx-auto mb-1 text-[var(--ground)]" />}
        value={stats.ground} label={t('on_ground', language)} color="var(--ground)"
      />
      <StatCell
        icon={<Radio size={18} className="mx-auto mb-1 text-[var(--primary)]" />}
        value={stats.total} label={t('total', language)} color="var(--primary)"
      />
    </div>
  );
}
