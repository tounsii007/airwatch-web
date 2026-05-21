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

/** Search input for the cargo list — matches callsign / airline / dep / arr. */
export function CargoSearch({ value, onChange, language }: Props) {
  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={t('search_flights', language)}
      leadingIcon={<Search size={14} />}
      size="sm"
      clearable
    />
  );
}
