'use client';

import { ReactNode } from 'react';
import { Package, Plane, PlaneLanding } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { CargoStats } from '@/app/(public)/cargo/cargoStats';
import type { CargoStatusFilter } from '@/app/(public)/cargo/cargoFilter';

interface Props {
  stats: CargoStats;
  filter: CargoStatusFilter;
  onFilter: (next: CargoStatusFilter) => void;
  language: AppLanguage;
}

function activeClass(active: boolean, color: string): string {
  return active ? `border-[${color}]/50 bg-[${color}]/8` : 'hover:bg-white/5';
}

function StatCell({
  icon, value, label, color, onClick, isActive,
}: {
  icon: ReactNode; value: number; label: string; color: string; onClick?: () => void; isActive?: boolean;
}) {
  const cursor = onClick ? 'cursor-pointer transition-colors' : '';
  const active = onClick ? activeClass(Boolean(isActive), color) : '';
  return (
    <GlassPanel className={`p-3 text-center ${cursor} ${active}`} onClick={onClick}>
      {icon}
      <div className="text-base font-[var(--font-heading)] font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">{label}</div>
    </GlassPanel>
  );
}

function toggleOrAll(current: CargoStatusFilter, target: CargoStatusFilter): CargoStatusFilter {
  return current === target ? 'all' : target;
}

/** Four stat cards — airborne / ground / total / operators; three act as filters. */
export function CargoStatsRow({ stats, filter, onFilter, language }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCell
        icon={<Plane size={16} className="mx-auto mb-1 text-[var(--success)]" />}
        value={stats.airborne} label={t('airborne', language)} color="var(--success)"
        isActive={filter === 'airborne'} onClick={() => onFilter(toggleOrAll(filter, 'airborne'))}
      />
      <StatCell
        icon={<PlaneLanding size={16} className="mx-auto mb-1 text-[var(--ground)]" />}
        value={stats.ground} label={t('on_ground', language)} color="var(--ground)"
        isActive={filter === 'ground'} onClick={() => onFilter(toggleOrAll(filter, 'ground'))}
      />
      <StatCell
        icon={<Package size={16} className="mx-auto mb-1 text-[var(--accent)]" />}
        value={stats.total} label={t('total', language)} color="var(--accent)"
        isActive={filter === 'all'} onClick={() => onFilter('all')}
      />
      <StatCell
        icon={<Package size={16} className="mx-auto mb-1 text-[var(--primary)]" />}
        value={stats.operators} label={t('cargo_operators', language)} color="var(--primary)"
      />
    </div>
  );
}
