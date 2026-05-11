'use client';

import { Search } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** Search bar for filtering an airline's flights by icao/iata/dep/arr. */
export function FlightSearch({ value, onChange }: Props) {
  const language = useSettingsStore((s) => s.language);
  return (
    <GlassPanel className="flex items-center gap-2 px-3 py-2">
      <Search size={16} className="text-[var(--text-muted)] shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('search_flights', language)}
        aria-label={t('search_flights', language)}
        className="flex-1 bg-transparent text-sm font-[var(--font-body)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label={t('clear', language)}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs"
        >
          &times;
        </button>
      )}
    </GlassPanel>
  );
}
