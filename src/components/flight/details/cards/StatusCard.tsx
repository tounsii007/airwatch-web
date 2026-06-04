'use client';

/**
 * StatusCard — "STATUS" glass tile for the flight detail panel.
 *
 * Surfaces the operational status badge plus whatever scheduled-time and
 * gate/terminal/baggage facts the upstream route lookup actually returned.
 *
 * <h3>Render strategy (mirrors the rest of the detail cards)</h3>
 * Every field is independently gated — we render a row only when its value
 * is present. Gate, terminal and baggage numbers are shown verbatim from
 * {@link FlightRouteInfo}; they are NEVER synthesised or defaulted, because a
 * wrong gate is worse than a missing one. When the badge, both times and all
 * facility fields are empty there is nothing useful to show, so the card
 * falls back to a single "Status details unavailable" line.
 *
 * Times are formatted exactly like {@code TimesRow} in ../primitives: the
 * ISO string is sliced at [11,16) to pull "HH:MM" without pulling in a date
 * library or assuming a timezone offset the backend didn't send.
 */

import { StatusBadge } from '@/components/ui/StatusBadge';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage, FlightRouteInfo } from '@/lib/types';

interface Props {
  routeInfo?: FlightRouteInfo | null;
  flightStatus?: string;
  language: AppLanguage;
}

/** "HH:MM" from an ISO timestamp, or null when absent/too short to slice. */
function hhmm(iso?: string): string | null {
  if (!iso || iso.length < 16) return null;
  return iso.slice(11, 16);
}

/** One labelled time column (DEP / ARR) with an optional delay chip. */
function TimeColumn({
  label,
  time,
  delayed,
  align = 'left',
}: {
  label: string;
  time: string;
  delayed?: number;
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <span className="block text-[9px] font-[var(--font-heading)] tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-[var(--text-primary)] font-[var(--font-body)] text-xs">{time}</span>
      {(delayed ?? 0) > 0 && (
        <span className="ml-1 text-[10px] font-bold text-[var(--error)]">+{delayed}min</span>
      )}
    </div>
  );
}

/** A single facility fact (gate / terminal / baggage). */
function FacilityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="font-[var(--font-heading)] tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className="font-[var(--font-body)] text-[var(--text-secondary)]">{value}</span>
    </div>
  );
}

/**
 * Status / schedule / facility card.
 *
 * @param routeInfo    Upstream route lookup; gate/terminal/baggage come from here.
 * @param flightStatus Live status fallback when {@code routeInfo.status} is absent.
 * @param language     Active app language; drives the translated "status
 *                     unavailable" fallback copy. (The "STATUS" heading and the
 *                     facility labels remain locale-neutral abbreviations.)
 */
export function StatusCard({ routeInfo, flightStatus, language }: Props) {
  const status = routeInfo?.status ?? flightStatus;

  const depTime = hhmm(routeInfo?.scheduledDep);
  const arrTime = hhmm(routeInfo?.scheduledArr);

  // Render gate/terminal/baggage strictly from what the backend sent — never
  // invent a number. Each entry is dropped when its source field is empty.
  const facilities: Array<{ key: string; label: string; value: string }> = [];
  if (routeInfo?.depTerminal) facilities.push({ key: 'dep-terminal', label: 'DEP TERMINAL', value: routeInfo.depTerminal });
  if (routeInfo?.depGate) facilities.push({ key: 'dep-gate', label: 'DEP GATE', value: routeInfo.depGate });
  if (routeInfo?.arrTerminal) facilities.push({ key: 'arr-terminal', label: 'ARR TERMINAL', value: routeInfo.arrTerminal });
  if (routeInfo?.arrGate) facilities.push({ key: 'arr-gate', label: 'ARR GATE', value: routeInfo.arrGate });
  if (routeInfo?.arrBaggage) facilities.push({ key: 'arr-baggage', label: 'BAGGAGE', value: routeInfo.arrBaggage });

  const hasTimes = Boolean(depTime || arrTime);
  const hasAnything = Boolean(status) || hasTimes || facilities.length > 0;

  return (
    <div className="glass-panel rounded-xl px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
          STATUS
        </span>
        {status && <StatusBadge status={status} />}
      </div>

      {!hasAnything && (
        <p className="text-[11px] font-[var(--font-body)] text-[var(--text-muted)]">
          {t('status_unavailable', language)}
        </p>
      )}

      {hasTimes && (
        <div className="flex items-start justify-between">
          {depTime && <TimeColumn label="DEP" time={depTime} delayed={routeInfo?.depDelayed} />}
          {arrTime && <TimeColumn label="ARR" time={arrTime} delayed={routeInfo?.arrDelayed} align="right" />}
        </div>
      )}

      {facilities.length > 0 && (
        <div className={`space-y-1 ${hasTimes ? 'mt-3 border-t border-[var(--glass-border)] pt-2' : ''}`}>
          {facilities.map((f) => (
            <FacilityRow key={f.key} label={f.label} value={f.value} />
          ))}
        </div>
      )}
    </div>
  );
}
