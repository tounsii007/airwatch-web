'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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

  // Max-delay used as the denominator for per-row severity bars. We keep
  // the value stable across re-renders so a small refresh that drops the
  // top flight doesn't cause every remaining bar to grow — the eye reads
  // bar length as "delay change" otherwise.
  const maxDelay = useMemo(
    () => flights.reduce((m, f) => Math.max(m, f.delayed ?? 0), 1),
    [flights],
  );

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)] truncate">
            {t('top_delays_now', language)}
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] truncate">{t('top_delays_subtitle', language)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
              flight={f} index={i + 1} maxDelay={maxDelay} />
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

function DelayRow({
  flight,
  index,
  maxDelay,
}: {
  flight: DelayedFlight;
  index: number;
  maxDelay: number;
}) {
  const minutes = flight.delayed ?? 0;
  const severity = Math.max(2, Math.round((minutes / maxDelay) * 100));
  const tone = severityTone(minutes);
  return (
    <li className="relative flex items-center gap-3 px-2 py-1.5 rounded overflow-hidden hover:bg-[var(--surface-hover)]">
      {/* Severity bar — sits behind the row content as a thin
          background fill. The longer the bar, the longer the delay
          relative to the worst entry on the current list. Pure CSS,
          no extra layout cost. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-r-sm pointer-events-none"
        style={{ width: `${severity}%`, background: tone.bar }}
      />
      <span
        aria-hidden
        className="relative shrink-0 w-5 h-5 inline-flex items-center justify-center rounded-full text-[10px] font-[var(--font-heading)] font-bold tabular"
        style={{ background: tone.badgeBg, color: tone.badgeFg }}
      >
        {index}
      </span>
      <span className="relative font-[var(--font-heading)] text-xs font-bold text-[var(--primary)] min-w-[60px]">
        {flight.flight_iata ?? flight.flight_icao ?? '—'}
      </span>
      <span className="relative text-[10px] text-[var(--text-secondary)] flex-1 truncate tabular">
        {flight.dep_iata ?? '???'} → {flight.arr_iata ?? '???'}
      </span>
      <span
        className="relative text-[10px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded tabular shrink-0"
        style={{ background: tone.chipBg, color: tone.chipFg }}
      >
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
  // Use the warning channel — an alert icon plus a soft tinted background
  // beats a single muted-grey paragraph at telegraphing "something is
  // wrong here, this isn't just empty". role=alert makes screen readers
  // announce it on appearance.
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-[var(--warning)]/30 bg-[var(--warning)]/8 px-3 py-2.5 text-xs text-[var(--text-secondary)]"
    >
      <AlertTriangle size={14} aria-hidden className="text-[var(--warning)] shrink-0 mt-0.5" />
      <span className="leading-snug">{t(key, language)}</span>
    </div>
  );
}

// Severity is bucketed against the same FAA-style thresholds the rest of
// the dashboard uses (15 min "on-time" cliff → 30 → 60). Each tone packs
// four colours: chip background + foreground (the +N min badge),
// rank-circle background + foreground, and the row-spanning severity
// bar tint. Returning them together keeps the row palette in lockstep —
// previously the chip and a hypothetical second indicator could drift.
type Tone = {
  chipBg: string;
  chipFg: string;
  badgeBg: string;
  badgeFg: string;
  bar: string;
};

function severityTone(min: number): Tone {
  // Severity buckets:
  //   ≥ 60 min → red (compensation-level under EU 261)
  //   30–59   → orange (operationally disruptive)
  //   < 30    → yellow (annoying but routine)
  if (min >= 60) {
    return {
      chipBg: 'color-mix(in srgb, var(--error) 20%, transparent)',
      chipFg: 'var(--error)',
      badgeBg: 'color-mix(in srgb, var(--error) 22%, transparent)',
      badgeFg: 'var(--error)',
      bar: 'color-mix(in srgb, var(--error) 10%, transparent)',
    };
  }
  if (min >= 30) {
    return {
      chipBg: 'color-mix(in srgb, var(--warning) 20%, transparent)',
      chipFg: 'var(--warning)',
      badgeBg: 'color-mix(in srgb, var(--warning) 22%, transparent)',
      badgeFg: 'var(--warning)',
      bar: 'color-mix(in srgb, var(--warning) 10%, transparent)',
    };
  }
  return {
    chipBg: 'color-mix(in srgb, var(--accent) 18%, transparent)',
    chipFg: 'var(--accent)',
    badgeBg: 'color-mix(in srgb, var(--accent) 20%, transparent)',
    badgeFg: 'var(--accent)',
    bar: 'color-mix(in srgb, var(--accent) 9%, transparent)',
  };
}
