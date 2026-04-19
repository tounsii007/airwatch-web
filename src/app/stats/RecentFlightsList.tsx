'use client';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { FlightStatEntry } from '@/lib/stores/statsStore';

function routeLabel(entry: FlightStatEntry): string {
  if (entry.depIata && entry.arrIata) return `${entry.depIata} → ${entry.arrIata}`;
  return entry.airlineIcao ?? entry.icao24;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function Row({ entry }: { entry: FlightStatEntry }) {
  return (
    <GlassPanel className="px-3 py-2 flex items-center justify-between">
      <div>
        <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
          {entry.callsign ?? entry.icao24}
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)]">
          {routeLabel(entry)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-[var(--font-heading)] font-bold text-[var(--primary)]">×{entry.viewCount}</div>
        <div className="text-[9px] text-[var(--text-muted)] font-[var(--font-body)]">{formatDate(entry.lastSeenAt)}</div>
      </div>
    </GlassPanel>
  );
}

interface Props {
  flights: FlightStatEntry[];
  language: AppLanguage;
}

/** "Recent flights" section on /stats (most-recent first). */
export function RecentFlightsList({ flights, language }: Props) {
  return (
    <div>
      <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
        {t('recent_flights', language)}
      </h3>
      <div className="space-y-1.5">
        {flights.map((entry) => <Row key={entry.icao24} entry={entry} />)}
      </div>
    </div>
  );
}
