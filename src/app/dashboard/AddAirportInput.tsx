'use client';

import { Plus } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  language: AppLanguage;
  value: string;
  onChange: (next: string) => void;
  onAdd: () => void;
}

/** Single input + "Add" button for adding an airport to the dashboard. */
export function AddAirportInput({ language, value, onChange, onAdd }: Props) {
  return (
    <GlassPanel className="flex items-center gap-2 px-3 py-2">
      <Plus size={16} className="text-[var(--text-muted)] shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        placeholder={t('add_airport_hint', language)}
        maxLength={3}
        className="flex-1 bg-transparent text-sm font-[var(--font-heading)] font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal outline-none tracking-wider"
      />
      <button
        onClick={onAdd}
        className="px-3 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer"
      >
        {t('add', language)}
      </button>
    </GlassPanel>
  );
}
