'use client';

import { PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

export type TabType = 'departures' | 'arrivals';

interface Props {
  active: TabType;
  onChange: (tab: TabType) => void;
  language: AppLanguage;
}

const ACTIVE_CLASS = 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30';
const INACTIVE_CLASS = 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]';

function TabButton({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider transition-all ${active ? ACTIVE_CLASS : INACTIVE_CLASS}`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Departures/Arrivals tab switcher. */
export function ScheduleTabs({ active, onChange, language }: Props) {
  return (
    <div className="flex gap-1">
      <TabButton
        active={active === 'departures'}
        onClick={() => onChange('departures')}
        icon={<PlaneTakeoff size={14} />}
        label={t('departures_tab', language)}
      />
      <TabButton
        active={active === 'arrivals'}
        onClick={() => onChange('arrivals')}
        icon={<PlaneLanding size={14} />}
        label={t('arrivals_tab', language)}
      />
    </div>
  );
}
