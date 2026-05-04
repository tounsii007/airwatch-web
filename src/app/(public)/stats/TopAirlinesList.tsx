'use client';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { LogoImage } from '@/components/common/LogoImage';
import { getAirlineLogoUrl, resolveAirline } from '@/lib/data/airlines';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  entries: [string, number][];
  language: AppLanguage;
}

function AirlineRow({ icao, count, language }: { icao: string; count: number; language: AppLanguage }) {
  const resolved = resolveAirline(icao);
  const name = resolved?.name ?? icao;
  const iata = resolved?.iata ?? '';
  return (
    <GlassPanel className="px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {iata && <LogoImage src={getAirlineLogoUrl(iata)} alt={name} width={40} height={16} className="h-4 w-auto object-contain opacity-80" />}
        <span className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">{name}</span>
      </div>
      <span className="text-xs font-[var(--font-heading)] font-bold text-[var(--primary)]">
        {count} {t('times_viewed', language)}
      </span>
    </GlassPanel>
  );
}

/** "Top airlines" section on /stats. Renders nothing when empty. */
export function TopAirlinesList({ entries, language }: Props) {
  if (entries.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
        {t('top_airlines', language)}
      </h3>
      <div className="space-y-1.5">
        {entries.map(([icao, count]) => <AirlineRow key={icao} icao={icao} count={count} language={language} />)}
      </div>
    </div>
  );
}
