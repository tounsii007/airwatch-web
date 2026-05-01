'use client';

/**
 * Live tail of ERROR-level log entries from the api side
 * ErrorLogBuffer. Polls /admin/api/monitoring/critical-errors every
 * 30 s. Distinct from AlertsPanel — that one shows curated cross-
 * cutting events the alerter decided to notify on; this one shows the
 * raw buffer so an operator can see "what's actually throwing".
 *
 * Each row collapses the throwable into the first stack frame so the
 * panel stays scannable. Click → expand (deferred to a future polish
 * pass; today the throwable shows in the title attribute on hover).
 */
import { useEffect, useState } from 'react';

interface ErrorEntry {
  ts: string;
  level: string;
  logger: string;
  message: string;
  signature: string;
  throwable: string | null;
}

interface ErrorPayload {
  totalSeen: number;
  buffered: number;
  entries: ErrorEntry[];
}

const REFRESH_MS = 30_000;

export function CriticalErrorPanel() {
  const [data, setData] = useState<ErrorPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch('/admin/api/monitoring/critical-errors?limit=20', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = (await res.json()) as ErrorPayload;
        if (!cancelled) setData(payload);
      } catch {
        // ignore
      }
    };
    void tick();
    const interval = setInterval(tick, REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Critical errors (live tail)</h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {data === null
              ? 'Loading…'
              : `${data.buffered} buffered · ${data.totalSeen.toLocaleString()} since startup`}
          </span>
        </div>
      </header>

      {data && data.entries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 380, overflow: 'auto' }}>
          {data.entries.map((e, idx) => <ErrorRow key={`${e.ts}-${idx}`} entry={e} />)}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
          {data === null ? 'Loading errors…' : 'No errors logged in current window.'}
        </p>
      )}
    </section>
  );
}

function ErrorRow({ entry }: { entry: ErrorEntry }) {
  const firstStackLine = entry.throwable?.split('\n')[0]?.trim() ?? '';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '70px 1fr',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        borderLeft: '3px solid var(--error)',
        background: 'color-mix(in srgb, var(--error) 5%, transparent)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-heading)',
      }}
      title={entry.throwable ?? ''}
    >
      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--error)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.message}
        </div>
        <div
          style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.6875rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <code>{entry.logger}</code>
          {firstStackLine && <span style={{ marginLeft: 8 }}>· {firstStackLine}</span>}
        </div>
      </div>
    </div>
  );
}
