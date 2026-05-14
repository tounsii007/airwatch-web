'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { FlightStatEntry } from '@/lib/stores/statsStore';
import { formatNumber, formatRelativeDate } from '@/app/(public)/stats/format';

type SortKey = 'recent' | 'views' | 'callsign';

function routeLabel(entry: FlightStatEntry): string {
  if (entry.depIata && entry.arrIata) return `${entry.depIata} → ${entry.arrIata}`;
  return entry.airlineIcao ?? entry.icao24;
}

/** Case-insensitive needle test across callsign / icao / route / airline. */
function matches(entry: FlightStatEntry, needle: string): boolean {
  if (!needle) return true;
  const hay = [entry.callsign, entry.icao24, entry.depIata, entry.arrIata, entry.airlineIcao]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

function Row({ entry, language }: { entry: FlightStatEntry; language: AppLanguage }) {
  return (
    <Link
      href={`/flight/${entry.icao24}`}
      className="block transition-transform hover:translate-x-0.5"
      aria-label={`${entry.callsign ?? entry.icao24} — ${routeLabel(entry)}`}
    >
      <GlassPanel className="px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)] truncate">
            {entry.callsign ?? entry.icao24}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">
            {routeLabel(entry)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-[var(--font-heading)] font-bold text-[var(--primary)]">
            ×{formatNumber(entry.viewCount, language)}
          </div>
          <div className="text-[9px] text-[var(--text-muted)] font-[var(--font-body)]">
            {formatRelativeDate(entry.lastSeenAt, language)}
          </div>
        </div>
      </GlassPanel>
    </Link>
  );
}

interface Props {
  flights: FlightStatEntry[];
  language: AppLanguage;
}

const SORT_OPTIONS: { key: SortKey; labelKey: 'sort_recent' | 'sort_views' | 'sort_callsign' }[] = [
  { key: 'recent',   labelKey: 'sort_recent' },
  { key: 'views',    labelKey: 'sort_views' },
  { key: 'callsign', labelKey: 'sort_callsign' },
];

/**
 * Recent flights with a live search + sort toggle. Search keeps the
 * full list cap (so users can find an old flight they only remember
 * the airline of) while sort toggles the order of the visible slice.
 * Clicking a row routes to the flight detail page.
 */
export function RecentFlightsList({ flights, language }: Props) {
  const [needle, setNeedle] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  const filtered = useMemo(() => {
    const n = needle.trim().toLowerCase();
    return flights.filter((f) => matches(f, n));
  }, [flights, needle]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'views') list.sort((a, b) => b.viewCount - a.viewCount);
    else if (sort === 'callsign') {
      list.sort((a, b) => (a.callsign ?? a.icao24).localeCompare(b.callsign ?? b.icao24));
    } else {
      list.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    }
    return list;
  }, [filtered, sort]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
          {t('recent_flights', language)}
        </h3>
        <div className="flex items-center gap-1" role="tablist" aria-label={t('sort_by', language)}>
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSort(opt.key)}
                aria-pressed={active}
                className={`px-2 py-0.5 rounded-md text-[10px] font-[var(--font-heading)] tracking-wider transition-colors cursor-pointer ${
                  active
                    ? 'bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                {t(opt.labelKey, language)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" aria-hidden />
        <input
          type="search"
          value={needle}
          onChange={(e) => setNeedle(e.target.value)}
          placeholder={t('filter_flights_placeholder', language)}
          className="w-full pl-7 pr-7 py-1.5 rounded-lg text-xs font-[var(--font-body)] bg-[color-mix(in_srgb,var(--glass-bg)_60%,transparent)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
          aria-label={t('filter_flights_placeholder', language)}
        />
        {needle && (
          <button
            type="button"
            onClick={() => setNeedle('')}
            aria-label={t('clear', language)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <GlassPanel className="px-3 py-4 text-center text-xs text-[var(--text-muted)] font-[var(--font-body)]">
          {t('no_matches', language)}
        </GlassPanel>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((entry) => <Row key={entry.icao24} entry={entry} language={language} />)}
        </div>
      )}
    </div>
  );
}
