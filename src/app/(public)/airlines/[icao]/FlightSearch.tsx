'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
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
    <Input
      value={value}
      onChange={onChange}
      placeholder={t('search_flights', language)}
      aria-label={t('search_flights', language)}
      leadingIcon={<Search size={14} />}
      size="sm"
      clearable
    />
  );
}
