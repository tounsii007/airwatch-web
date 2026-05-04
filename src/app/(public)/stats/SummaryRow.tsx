'use client';

import { ReactNode } from 'react';
import { BarChart2, Building2, Plane } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  totalViews: number;
  uniqueAirlines: number;
  uniqueAirports: number;
  language: AppLanguage;
}

function StatCell({ icon, value, label, color }: { icon: ReactNode; value: number; label: string; color: string }) {
  return (
    <GlassPanel className="p-3 text-center">
      {icon}
      <div className="text-lg font-[var(--font-heading)] font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">{label}</div>
    </GlassPanel>
  );
}

/** 3-cell summary row on /stats. */
export function SummaryRow({ totalViews, uniqueAirlines, uniqueAirports, language }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCell
        icon={<Plane size={16} className="mx-auto mb-1 text-[var(--primary)]" />}
        value={totalViews} label={t('total_viewed', language)} color="var(--primary)"
      />
      <StatCell
        icon={<BarChart2 size={16} className="mx-auto mb-1 text-[var(--accent)]" />}
        value={uniqueAirlines} label={t('unique_airlines', language)} color="var(--accent)"
      />
      <StatCell
        icon={<Building2 size={16} className="mx-auto mb-1 text-[var(--success)]" />}
        value={uniqueAirports} label={t('unique_airports', language)} color="var(--success)"
      />
    </div>
  );
}
