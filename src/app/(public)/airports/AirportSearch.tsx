'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
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
    <Input
      value={value}
      onChange={onChange}
      placeholder={t('search_flight_airport', language)}
      leadingIcon={<Search size={14} />}
      size="sm"
      clearable
    />
  );
}
