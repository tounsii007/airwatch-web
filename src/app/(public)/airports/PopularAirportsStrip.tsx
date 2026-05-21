'use client';

import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { localizeCity } from '@/lib/data/city-translations';
import type { AppLanguage } from '@/lib/types';
import type { PopularAirport } from '@/app/(public)/airports/popularAirports';

interface Props {
  airports: readonly PopularAirport[];
  language: AppLanguage;
}

function AirportChip({ airport, language }: { airport: PopularAirport; language: AppLanguage }) {
  // `airport.name` is the canonical English city label (see popularAirports.ts).
  // Run it through localizeCity so German users see "München" / "Nizza" etc.
  const label = localizeCity(airport.name, language);
  return (
    <Link href={`/airports/${airport.iata}`}>
      <GlassPanel
        interactive
        className="px-3 py-2 whitespace-nowrap rounded-lg hover:bg-[var(--primary)]/10 transition-colors"
      >
        <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--primary)] tabular">{airport.iata}</span>
        <span className="text-[10px] text-[var(--text-secondary)] ml-1.5 font-[var(--font-body)]">{label}</span>
      </GlassPanel>
    </Link>
  );
}

/** Horizontally-scrollable chip strip of popular airports. */
export function PopularAirportsStrip({ airports, language }: Props) {
  return (
    <div>
      <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
        {t('popular_airports', language)}
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {airports.map((a) => <AirportChip key={a.iata} airport={a} language={language} />)}
      </div>
    </div>
  );
}
