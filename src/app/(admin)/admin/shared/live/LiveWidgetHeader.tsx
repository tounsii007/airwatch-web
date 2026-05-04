/**
 * Header bar for a live-data widget. Combines:
 *   * Title + optional subtitle
 *   * Live pulse dot (animated when fresh, dimmed when stale)
 *   * "Updated Xs ago" label that ticks
 *   * Manual refresh button
 *
 * The refresh button calls the widget's local refresh() — the global
 * "Refresh all" handles fan-out separately via the broadcast event in
 * {@link useLiveData}.
 */
'use client';

import { useEffect, useState } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  loading?: boolean;
  lastUpdatedMs?: number | null;
  onRefresh: () => void;
  /** Optional right-side slot for extra controls (e.g. range selector). */
  right?: React.ReactNode;
}

export function LiveWidgetHeader({ title, subtitle, loading, lastUpdatedMs, onRefresh, right }: Props) {
  const ago = useAgoLabel(lastUpdatedMs);
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      marginBottom: '0.6rem',
      flexWrap: 'wrap',
    }}>
      <LivePulse loading={loading} stale={isStale(lastUpdatedMs)} />
      <h2 style={{ margin: 0, fontSize: '0.95rem' }}>{title}</h2>
      {subtitle && (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{subtitle}</span>
      )}
      <span style={{
        marginLeft: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        {right}
        <span style={{
          color: 'var(--text-muted)',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.05em',
        }} title={lastUpdatedMs ? new Date(lastUpdatedMs).toLocaleString() : 'never'}>
          {ago}
        </span>
        <RefreshButton loading={loading} onClick={onRefresh} />
      </span>
    </header>
  );
}

/** Small icon-only refresh button. Spinning when loading. */
export function RefreshButton({ loading, onClick }: { loading?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title="Refresh now"
      aria-label="Refresh"
      style={{
        width: 26,
        height: 26,
        borderRadius: 4,
        background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
        border: '1px solid var(--border)',
        color: loading ? 'var(--text-muted)' : 'var(--text-secondary)',
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'background 150ms, color 150ms',
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 18%, transparent)'); }}
      onMouseLeave={e => { (e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 8%, transparent)'); }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{
          animation: loading ? 'admin-refresh-spin 0.85s linear infinite' : undefined,
        }}
      >
        <path d="M14 8a6 6 0 1 1-1.76-4.24" />
        <path d="M14 2v4h-4" />
      </svg>
      <style>{`
        @keyframes admin-refresh-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}

/**
 * Live pulse dot.
 *   * fresh (default) — green pulse animation
 *   * loading         — spinning blue ring
 *   * stale (>2 min)  — solid muted dot, no animation
 */
export function LivePulse({ loading, stale }: { loading?: boolean; stale?: boolean }) {
  const color = loading ? 'var(--info)' : stale ? 'var(--text-muted)' : 'var(--success)';
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      {!loading && !stale && (
        <span style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          opacity: 0.6,
          animation: 'admin-live-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
        }}/>
      )}
      <style>{`
        @keyframes admin-live-ping {
          0%   { transform: scale(0.4); opacity: 0.85; }
          80%  { transform: scale(1.6); opacity: 0;    }
          100% { transform: scale(1.6); opacity: 0;    }
        }
      `}</style>
    </span>
  );
}

function isStale(ms: number | null | undefined): boolean {
  if (ms == null) return true;
  return Date.now() - ms > 2 * 60 * 1000;
}

/** Live-ticking "Xs ago" label — hydration-safe (renders absolute on SSR, swaps on mount). */
function useAgoLabel(lastUpdatedMs: number | null | undefined): string {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(n => n + 1), 5000);
    return () => clearInterval(id);
  }, []);
  if (!lastUpdatedMs) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - lastUpdatedMs) / 1000));
  if (seconds < 5)   return 'just now';
  if (seconds < 60)  return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}
