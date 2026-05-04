/**
 * Frontend (browser-side) error feed. (Phase 3.1)
 *
 * Polls /admin/api/frontend-errors every 15 s. Each row is an aggregated
 * signature: same exception bumped via the dedup logic in
 * FrontendErrorBuffer.record(). Hovering the count or message reveals
 * first-seen / last-seen timestamps; expanding a row shows the full
 * stack trace.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClientTime } from '@/app/(admin)/ClientTime';

interface FrontendErrorEntry {
  id: number;
  firstSeen: string;
  lastSeen: string;
  count: number;
  signature: string;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  username: string | null;
}

interface Payload {
  total: number;
  buffered: number;
  entries: FrontendErrorEntry[];
}

const REFRESH_MS = 15_000;

export function FrontendErrorsCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/frontend-errors', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      setData(await res.json());
    } catch { /* network blip */ }
  }, []);

  useEffect(() => {
    void reload();
    const id = setInterval(() => void reload(), REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (data === null) {
    return (
      <section className="admin-card">
        <h2>Frontend errors</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading…</p>
      </section>
    );
  }

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Frontend errors</h2>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {data.entries.length} signatures · {data.total} total seen lifetime
        </span>
      </header>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.75rem' }}>
        Uncaught exceptions + unhandled promise rejections from the admin shell. Same as the backend ring buffer
        but for browser code. Cleared when the api restarts.
      </p>

      {data.entries.length === 0 ? (
        <p style={{ color: 'var(--success)', fontSize: '0.8125rem' }}>✓ No browser-side errors recorded.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.entries.map(e => {
            const isOpen = expanded.has(e.id);
            return (
              <div key={e.id} style={{
                borderLeft: `3px solid var(--error)`,
                background: 'var(--sunken)',
                borderRadius: 4,
                padding: '0.5rem 0.75rem',
              }}>
                <button type="button" onClick={() => toggle(e.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto auto 1fr auto',
                          alignItems: 'center',
                          gap: '0.6rem',
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left' as const,
                          color: 'inherit',
                          fontFamily: 'inherit',
                        }}
                        title={isOpen ? 'Collapse' : 'Expand stack'}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={countBadgeStyle}>×{e.count}</span>
                  <span style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={e.message}>{e.message}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    <ClientTime iso={e.lastSeen} mode="relative" />
                  </span>
                </button>
                {isOpen && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <Field label="URL"        value={e.url} mono />
                    <Field label="User-Agent" value={e.userAgent} small />
                    {e.username && <Field label="Username" value={e.username} />}
                    <Field label="First seen" value={new Date(e.firstSeen).toLocaleString('de-DE')} small />
                    {e.stack && (
                      <div>
                        <div style={fieldLabelStyle}>Stack</div>
                        <pre style={{
                          margin: 0,
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                        }}>{e.stack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Field({ label, value, mono = false, small = false }: {
  label: string; value: string | null; mono?: boolean; small?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{
        color: 'var(--text-secondary)',
        fontSize: small ? '0.7rem' : '0.75rem',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>{value}</div>
    </div>
  );
}

const fieldLabelStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.55rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  fontWeight: 700,
  marginBottom: 2,
};
const countBadgeStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.05em',
  color: 'var(--error)',
  background: 'color-mix(in srgb, var(--error) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 25%, transparent)',
  padding: '1px 6px',
  borderRadius: 3,
  whiteSpace: 'nowrap' as const,
};
