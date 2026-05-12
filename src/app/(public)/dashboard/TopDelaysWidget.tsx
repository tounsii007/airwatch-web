'use client';

import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { useTopDelays, type DelaysType } from '@/app/(public)/dashboard/useTopDelays';
import type { DelayedFlight } from '@/lib/airlabs/schemas';

/**
 * "Top delays right now" — a 10-row leaderboard of worst-delayed flights
 * worldwide, refreshed every 60 s. Backed by Airlabs's {@code /delays}
 * endpoint (server-side filter, server-side cache).
 *
 * <h3>Why this lives on the dashboard</h3>
 * The dashboard is the home page that cold-started users land on. A
 * live-data widget makes the page feel alive without forcing the user
 * to add airports first — and clicking through a delayed flight is a
 * natural way to discover the rest of the app's drill-down UX.
 */
export function TopDelaysWidget() {
  const { language } = useSettingsStore();
  const [type, setType] = useState<DelaysType>('departures');
  const { flights, loading, error, refresh } = useTopDelays(type, 10);

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
            {t('top_delays_now', language)}
          </h3>
          <p className="text-[10px] text-[var(--text-muted)]">{t('top_delays_subtitle', language)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Tab active={type === 'departures'} onClick={() => setType('departures')}>
            {t('departures_tab', language)}
          </Tab>
          <Tab active={type === 'arrivals'} onClick={() => setType('arrivals')}>
            {t('arrivals_tab', language)}
          </Tab>
          <button
            type="button"
            onClick={refresh}
            className="ml-1 px-2 py-1 text-[10px] rounded bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] disabled:opacity-50"
            disabled={loading}
            aria-label={t('refresh', language)}
            title={t('refresh', language)}
          >↻</button>
        </div>
      </div>

      {error && <ErrorState code={error} language={language} />}
      {!error && loading && flights.length === 0 && <LoadingSkeleton />}
      {!error && !loading && flights.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] py-6 text-center">
          {t('top_delays_empty', language)}
        </p>
      )}

      {flights.length > 0 && (
        <ol className="space-y-1">
          {flights.map((f, i) => (
            <DelayRow key={`${f.flight_iata ?? f.flight_icao ?? i}-${i}`}
              flight={f} index={i + 1} />
          ))}
        </ol>
      )}
    </GlassPanel>
  );
}

// ─── Subcomponents ───

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-2 py-1 text-[10px] font-[var(--font-heading)] uppercase tracking-wide rounded ' +
        (active
          ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]')
      }
    >{children}</button>
  );
}

function DelayRow({ flight, index }: { flight: DelayedFlight; index: number }) {
  const minutes = flight.delayed ?? 0;
  return (
    <li className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[var(--surface-hover)]">
      <span className="text-[10px] text-[var(--text-muted)] w-5 text-right">{index}</span>
      <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--primary)] min-w-[60px]">
        {flight.flight_iata ?? flight.flight_icao ?? '—'}
      </span>
      <span className="text-[10px] text-[var(--text-secondary)] flex-1 truncate">
        {flight.dep_iata ?? '???'} → {flight.arr_iata ?? '???'}
      </span>
      <span className={delayClass(minutes) +
          ' text-[10px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded'}>
        +{minutes} min
      </span>
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-7 rounded bg-[var(--surface-hover)] animate-pulse" />
      ))}
    </div>
  );
}

function ErrorState({ code, language }: { code: string; language: 'en' | 'de' | 'fr' | 'es' | 'it' | 'ar' | 'pl' | 'nl' | 'tr' }) {
  // Map the discriminated AirlabsError codes to user-readable copy.
  const key =
    code === 'rate_limited'      ? 'top_delays_err_rate_limited' :
    code === 'quota_exhausted'   ? 'top_delays_err_quota' :
    code === 'network'           ? 'top_delays_err_network' :
                                    'top_delays_err_generic';
  return (
    <p className="text-xs text-[var(--text-muted)] py-6 text-center">
      {t(key, language)}
    </p>
  );
}

function delayClass(min: number): string {
  if (min >= 60) return 'bg-red-500/20 text-red-400';
  if (min >= 30) return 'bg-orange-500/20 text-orange-400';
  return 'bg-yellow-500/15 text-yellow-400';
}
