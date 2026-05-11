'use client';

/**
 * Route popularity badge — surfaces a short "X flights/week, Y today"
 * line beneath the dep→arr arrow on the flight detail panel.
 *
 * <h3>Why a separate component</h3>
 * RouteSection is a pure visual block (loaded by both desktop and mobile).
 * The stats badge involves a network round-trip and a defensive
 * "no data" branch; isolating it here keeps RouteSection synchronous +
 * easy to test, and lets the badge hide itself entirely when the
 * route has never been observed.
 *
 * <h3>Render contract</h3>
 *   * loading → renders nothing (no layout pop)
 *   * fetch error / non-2xx → renders nothing
 *   * observed=false (never seen this route) → renders nothing
 *   * observed=true → small inline badge with month/week/today counts
 */

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  depIata?: string;
  arrIata?: string;
  language: AppLanguage;
}

interface RouteResponse {
  depIata: string;
  arrIata: string;
  observed: boolean;
  todayCount?: number;
  weekCount?: number;
  monthCount?: number;
  lastCallsign?: string;
  lastSeenAt?: string;
}

function isValidIata(s: string | undefined): s is string {
  return typeof s === 'string' && /^[A-Za-z]{3,4}$/.test(s);
}

export function RouteStatsBadge({ depIata, arrIata, language }: Props) {
  const [data, setData] = useState<RouteResponse | null>(null);

  useEffect(() => {
    if (!isValidIata(depIata) || !isValidIata(arrIata)) {
      setData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/routes/${depIata}/${arrIata}`, { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return;
        const body: RouteResponse = await res.json();
        if (!cancelled) setData(body);
      })
      .catch(() => { /* swallow — badge just hides */ });
    return () => { cancelled = true; };
  }, [depIata, arrIata]);

  if (!data || !data.observed) return null;

  const hasMonth = (data.monthCount ?? 0) > 0;
  const hasWeek  = (data.weekCount ?? 0) > 0;
  const hasToday = (data.todayCount ?? 0) > 0;
  if (!hasMonth && !hasWeek && !hasToday) return null;

  const fmt = (n: number) => n.toLocaleString(language);

  return (
    <div className="px-4 pt-1 pb-2 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
      <TrendingUp size={11} className="text-[var(--primary)]/70 shrink-0" />
      {hasToday && (
        <span>
          <span className="font-[var(--font-heading)] text-[var(--text-secondary)]">{fmt(data.todayCount!)}</span>
          {' '}
          {t('route_today_flights', language)}
        </span>
      )}
      {hasWeek && (
        <span>
          <span className="font-[var(--font-heading)] text-[var(--text-secondary)]">{fmt(data.weekCount!)}</span>
          {' '}
          {t('route_week_flights', language)}
        </span>
      )}
      {hasMonth && (
        <span>
          <span className="font-[var(--font-heading)] text-[var(--text-secondary)]">{fmt(data.monthCount!)}</span>
          {' '}
          {t('route_month_flights', language)}
        </span>
      )}
    </div>
  );
}
