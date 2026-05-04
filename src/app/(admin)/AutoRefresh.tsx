'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dispatchGlobalRefresh } from '@/app/(admin)/admin/shared/live/useLiveData';

/**
 * Auto-refresh control with configurable interval.
 *
 * Replaces the previous one-shot RefreshButton with a combined manual
 * trigger + interval picker. Choices: Off / 1s / 5s / 30s / 60s / 3m /
 * 5m. The choice is persisted in localStorage so it survives navigation
 * within the admin SPA.
 *
 * <h3>Mechanics</h3>
 *   * "Off" mode → button alone, no automatic refreshes.
 *   * Any interval → setInterval calls router.refresh() on the schedule.
 *   * Visibility-aware → the interval is paused while the tab is hidden
 *     (document.visibilityState === 'hidden') so a backgrounded tab
 *     doesn't keep hammering the api.
 *
 * <h3>Visual states</h3>
 *   * idle           → ↻ Refresh
 *   * loading        → ⟳ Refreshing… (rotating)
 *   * just-refreshed → ✓ Updated (1.5 s)
 *
 * The interval dropdown sits next to the manual button so the operator
 * sees their current cadence at a glance.
 */

const STORAGE_KEY = 'airwatch.admin.autorefresh.interval';

export interface IntervalOption {
  /** Stable id for storage. */
  id: 'off' | '1s' | '5s' | '30s' | '60s' | '3m' | '5m';
  label: string;
  /** ms — 0 means manual-only. */
  ms: number;
}

export const INTERVALS: readonly IntervalOption[] = [
  { id: 'off', label: 'Manual only', ms: 0 },
  { id: '1s',  label: '1 second',    ms: 1_000 },
  { id: '5s',  label: '5 seconds',   ms: 5_000 },
  { id: '30s', label: '30 seconds',  ms: 30_000 },
  { id: '60s', label: '1 minute',    ms: 60_000 },
  { id: '3m',  label: '3 minutes',   ms: 180_000 },
  { id: '5m',  label: '5 minutes',   ms: 300_000 },
];

const DEFAULT_INTERVAL: IntervalOption['id'] = 'off';

export function AutoRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [justDone, setJustDone]   = useState(false);
  const [intervalId, setIntervalId] = useState<IntervalOption['id']>(DEFAULT_INTERVAL);
  const [mounted, setMounted]     = useState(false);
  const timerRef = useRef<number | null>(null);

  // Load saved interval on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) as IntervalOption['id'] | null;
      if (raw && INTERVALS.some((i) => i.id === raw)) setIntervalId(raw);
    } catch { /* private mode */ }
    setMounted(true);
  }, []);

  // Wire up the timer whenever the interval changes.
  useEffect(() => {
    // Clear previous timer.
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const opt = INTERVALS.find((i) => i.id === intervalId);
    if (!opt || opt.ms === 0) return;

    const tick = () => {
      // Skip if tab is hidden — no point hitting the api when nobody's
      // watching, and 1-second polling on 30 backgrounded tabs would
      // hammer the cluster pointlessly.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      runRefresh();
    };
    timerRef.current = window.setInterval(tick, opt.ms);
    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // runRefresh intentionally omitted — it doesn't capture changing
    // state, and including it would cause the timer to reset on every
    // refresh tick, which is what we explicitly don't want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalId]);

  function runRefresh() {
    setJustDone(false);
    // Broadcast to every mounted useLiveData hook FIRST — they re-fetch
    // their own endpoint in parallel, no waiting on the server-component
    // render cycle. router.refresh() then re-runs the SSR-rendered shell
    // (header KPIs, page H1s) for any data that doesn't have a live
    // widget yet. Two layers of refresh, both fired off in one click.
    dispatchGlobalRefresh();
    startTransition(() => {
      router.refresh();
      setTimeout(() => setJustDone(true),  100);
      setTimeout(() => setJustDone(false), 1600);
    });
  }

  function pickInterval(id: IntervalOption['id']) {
    setIntervalId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
  }

  const label = pending  ? 'Refreshing…'
              : justDone ? 'Updated'
              : 'Refresh';
  const icon  = pending  ? '⟳'
              : justDone ? '✓'
              : '↻';
  const tone  = justDone ? 'var(--success)'
              : 'var(--text-secondary)';

  return (
    <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
      <select
        value={mounted ? intervalId : DEFAULT_INTERVAL}
        onChange={(e) => pickInterval(e.target.value as IntervalOption['id'])}
        title="Auto-refresh interval"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.7rem',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '0.3rem 0.5rem',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        {INTERVALS.map((i) => (
          <option key={i.id} value={i.id}>
            {i.id === 'off' ? '⏸ ' : '⏵ '}{i.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={runRefresh}
        disabled={pending}
        title="Re-fetch all server-rendered data on this page"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontFamily: 'var(--font-heading)',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: tone,
          background: 'transparent',
          border: '1px solid var(--border)',
          padding: '0.3rem 0.7rem',
          borderRadius: 4,
          cursor: pending ? 'wait' : 'pointer',
          transition: 'color 200ms, border-color 200ms',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            fontSize: '0.85rem',
            animation: pending ? 'admin-autorefresh-spin 0.9s linear infinite' : 'none',
          }}
        >
          {icon}
        </span>
        {label}
        <style>{`
          @keyframes admin-autorefresh-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </button>
    </div>
  );
}
