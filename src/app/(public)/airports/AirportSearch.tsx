'use client';

import { Search } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: AppLanguage;
}

/** Search input for /airports (matches flight callsign / airport code / name). */
export function AirportSearch({ value, onChange, language }: Props) {
  return (
    <GlassPanel className="flex items-center gap-2 px-3 py-2">
      <Search size={16} className="text-[var(--text-muted)] shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('search_flight_airport', language)}
        className="flex-1 bg-transparent text-sm font-[var(--font-body)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs">&times;</button>
      )}
    </GlassPanel>
  );
}
