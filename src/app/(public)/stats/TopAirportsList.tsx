'use client';

import { Building2 } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { getAirportCity, getAirportCountry } from '@/lib/data/airportIndex';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import { formatNumber } from '@/app/(public)/stats/format';

interface Props {
  entries: [string, number][];
  language: AppLanguage;
}

function AirportRow({ iata, count, language }: { iata: string; count: number; language: AppLanguage }) {
  const city = getAirportCity(iata);
  const country = getAirportCountry(iata);
  return (
    <GlassPanel className="px-3 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--success) 12%, transparent)',
            color: 'var(--success)',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--success) 28%, transparent)',
          }}
          aria-hidden
        >
          <Building2 size={14} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-[var(--font-heading)] font-bold text-[var(--text-primary)] tracking-wider">{iata}</div>
          {(city || country) && (
            <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">
              {[city, country].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      </div>
      <span className="text-xs font-[var(--font-heading)] font-bold text-[var(--success)] shrink-0">
        ×{formatNumber(count, language)}
      </span>
    </GlassPanel>
  );
}

export function TopAirportsList({ entries, language }: Props) {
  if (entries.length === 0) return null;
  return (
    <Card
      title={t('top_airports', language)}
      badge={<Tag variant="success" size="sm">{entries.length}</Tag>}
      bare
      bodyClassName="px-4 pb-4 pt-1 space-y-1.5"
    >
      {entries.map(([iata, count]) => (
        <AirportRow key={iata} iata={iata} count={count} language={language} />
      ))}
    </Card>
  );
}
