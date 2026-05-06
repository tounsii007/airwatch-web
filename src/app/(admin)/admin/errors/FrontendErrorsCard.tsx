/**
 * Frontend (browser-side) error feed. (Phase 3.1+ / V13)
 *
 * <h3>Live vs Persisted</h3>
 * Two modes via a header toggle:
 *   * <b>Live</b>  — polls the in-memory ring at /admin/api/frontend-errors
 *     every 15 s. Fast read; cleared when the api restarts.
 *   * <b>Persisted</b> — pulls /admin/api/frontend-errors/persisted which
 *     queries admin_frontend_error directly. Survives api restarts +
 *     replica failovers; ideal for an investigation that pre-dates the
 *     current process.
 *
 * Each row is an aggregated signature: same exception bumped via the
 * dedup logic in FrontendErrorBuffer.record(). Expanding a row reveals:
 *   * Stack trace (raw — TODO source-map de-min)
 *   * URL, user-agent, username
 *   * <b>Release tag</b> — which build the error came from
 *   * <b>Session id</b> — joinable with admin_audit_log
 *   * <b>Breadcrumbs</b> — last 10 user actions before the throw
 *     (Sentry-style, captured in the browser by installBreadcrumbAutoCapture)
 */
'use client';

import { useState } from 'react';
import { ClientTime } from '@/app/(admin)/ClientTime';
import { useLiveData } from '@/app/(admin)/admin/shared/live/useLiveData';

interface FrontendErrorEntry {
  id: number;
  firstSeen?: string;
  occurredAt?: string;
  lastSeen?: string;
  lastSeenAt?: string;
  count?: number;
  occurrenceCount?: number;
  signature: string;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  username: string | null;
  releaseTag?: string | null;
  sessionId?: string | null;
  breadcrumbs?: string | null;
}

interface LivePayload    { total: number; buffered: number; entries: FrontendErrorEntry[] }
interface PersistedPayload { limit: number; entries: FrontendErrorEntry[] }

const REFRESH_MS = 15_000;

type Mode = 'live' | 'persisted';

export function FrontendErrorsCard() {
  const [mode, setMode] = useState<Mode>('live');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const live = useLiveData<LivePayload>(
    mode === 'live' ? '/admin/api/frontend-errors' : null,
    { intervalMs: REFRESH_MS },
  );
  const persisted = useLiveData<PersistedPayload>(
    mode === 'persisted' ? '/admin/api/frontend-errors/persisted?limit=200' : null,
    { intervalMs: REFRESH_MS },
  );

  const data = mode === 'live' ? live.data : persisted.data;
  const entries: FrontendErrorEntry[] = data?.entries ?? [];

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Frontend errors</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ModeToggle mode={mode} onChange={setMode} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {mode === 'live' && live.data
              ? `${entries.length} signatures · ${live.data.total} total seen lifetime`
              : `${entries.length} signatures (DB)`}
          </span>
        </div>
      </header>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.75rem' }}>
        Uncaught exceptions + unhandled promise rejections from the admin shell. Live = current api process&apos;s ring;
        Persisted = admin_frontend_error table (survives restarts).
      </p>

      {entries.length === 0 ? (
        <p style={{ color: 'var(--success)', fontSize: '0.8125rem' }}>✓ No browser-side errors recorded.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map(e => {
            const isOpen   = expanded.has(e.id);
            const lastSeen = e.lastSeenAt ?? e.lastSeen ?? e.occurredAt ?? '';
            const firstSeen = e.firstSeen ?? e.occurredAt ?? '';
            const count    = e.occurrenceCount ?? e.count ?? 1;
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
                          gridTemplateColumns: 'auto auto 1fr auto auto',
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
                        title={isOpen ? 'Collapse' : 'Expand details'}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{isOpen ? '▾' : '▸'}</span>
                  <span style={countBadgeStyle}>×{count}</span>
                  <span style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={e.message}>{e.message}</span>
                  {e.releaseTag && <span style={releaseBadgeStyle} title="Release tag">{e.releaseTag}</span>}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    {lastSeen && <ClientTime iso={lastSeen} mode="relative" />}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <Field label="URL"        value={e.url} mono />
                    <Field label="User-Agent" value={e.userAgent} small />
                    {e.username    && <Field label="Username"    value={e.username} />}
                    {e.releaseTag  && <Field label="Release"     value={e.releaseTag} />}
                    {e.sessionId   && <Field label="Session id"  value={e.sessionId} mono small />}
                    {firstSeen && <Field label="First seen" value={new Date(firstSeen).toLocaleString('de-DE')} small />}
                    {e.breadcrumbs && <BreadcrumbList raw={e.breadcrumbs} />}
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

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{ display: 'inline-flex', borderRadius: 4, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <ModeButton label="Live"      active={mode === 'live'}      onClick={() => onChange('live')} />
      <ModeButton label="Persisted" active={mode === 'persisted'} onClick={() => onChange('persisted')} />
    </div>
  );
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '0.625rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: active ? 'var(--primary-bright)' : 'var(--text-secondary)',
        background: active ? 'color-mix(in srgb, var(--primary-bright) 14%, transparent)' : 'transparent',
        border: 'none',
        padding: '0.35rem 0.75rem',
        cursor: 'pointer',
      }}
    >{label}</button>
  );
}

function BreadcrumbList({ raw }: { raw: string }) {
  let crumbs: Array<{ ts: string; kind: string; data: Record<string, unknown> }> = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) crumbs = parsed;
  } catch { /* malformed — render nothing */ }
  if (crumbs.length === 0) return null;
  return (
    <div>
      <div style={fieldLabelStyle}>Breadcrumbs (last {crumbs.length})</div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {crumbs.map((c, i) => (
          <li key={i} style={{
            display: 'grid',
            gridTemplateColumns: '90px 110px 1fr',
            gap: 8,
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            padding: '2px 6px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 3,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {new Date(c.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span style={{ color: kindColor(c.kind) }}>{c.kind}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={JSON.stringify(c.data)}>
              {summarizeData(c.kind, c.data)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function summarizeData(kind: string, data: Record<string, unknown>): string {
  if (kind === 'route' && typeof data.to === 'string')   return `→ ${data.to}`;
  if (kind === 'click' && typeof data.selector === 'string') return data.selector;
  if (kind === 'fetch:start' && typeof data.url === 'string') return `${data.method ?? 'GET'} ${data.url}`;
  if (kind === 'fetch:response' && typeof data.url === 'string') {
    return `${data.method ?? 'GET'} ${data.url} → ${data.status} (${data.durationMs ?? '?'}ms)`;
  }
  if (kind === 'error' && typeof data.message === 'string') return data.message;
  return JSON.stringify(data);
}

function kindColor(kind: string): string {
  if (kind === 'error')          return 'var(--error)';
  if (kind === 'fetch:response') return 'var(--info)';
  if (kind === 'fetch:start')    return 'var(--text-muted)';
  if (kind === 'click')          return 'var(--primary-bright)';
  if (kind === 'route')          return 'var(--success)';
  return 'var(--text-secondary)';
}

function Field({ label, value, mono = false, small = false }: {
  label: string; value: string | null | undefined; mono?: boolean; small?: boolean;
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
const releaseBadgeStyle = {
  fontFamily: 'monospace',
  fontSize: '0.6rem',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid var(--border)',
  padding: '1px 6px',
  borderRadius: 3,
  whiteSpace: 'nowrap' as const,
};
