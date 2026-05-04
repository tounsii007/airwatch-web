/**
 * Client wrapper for the synthetic probes page (Phase 2.3).
 * Lists probes, lets the operator add/enable/disable/delete.
 */
'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';
import { ClientTime } from '@/app/(admin)/ClientTime';

interface Probe {
  id: number;
  name: string;
  method: string;
  url: string;
  expectStatus: number;
  expectBody: string | null;
  intervalMin: number;
  timeoutSec: number;
  failThreshold: number;
  enabled: boolean;
  consecFailures: number;
}

interface Result {
  id: number;
  ran_at: string;
  status_code: number | null;
  latency_ms: number | null;
  ok: boolean;
  error: string | null;
}

interface Props {
  initialProbes: Probe[];
  csrfToken: string;
}

export function ProbesClient({ initialProbes, csrfToken }: Props) {
  const [probes, setProbes] = useState<Probe[]>(initialProbes);
  const [busy, setBusy] = useState(false);
  // Expanded probe id → fetched result list. Lazily loaded to keep the
  // initial render tiny (some probes have weeks of history).
  const [expanded, setExpanded] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, Result[]>>({});
  // Per-probe edit form draft. Null when not editing.
  const [editing, setEditing] = useState<Probe | null>(null);
  const toast = useToast();

  // New-probe form state
  const [name, setName]                   = useState('');
  const [method, setMethod]               = useState('GET');
  const [url, setUrl]                     = useState('https://');
  const [expectStatus, setExpectStatus]   = useState('200');
  const [expectBody, setExpectBody]       = useState('');
  const [intervalMin, setIntervalMin]     = useState('5');
  const [timeoutSec, setTimeoutSec]       = useState('10');
  const [failThreshold, setFailThreshold] = useState('3');

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/probes', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const body = await res.json();
      setProbes(body.probes ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => void reload(), 30_000);
    return () => clearInterval(id);
  }, [reload]);

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim() || !url.trim() || !csrfToken) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        _csrf: csrfToken,
        name: name.trim(), method, url: url.trim(),
        expectStatus, expectBody, intervalMin, timeoutSec, failThreshold,
      });
      const res = await fetch('/admin/api/probes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const body = await res.json();
      if (res.ok) {
        toast.success(`Probe "${name}" created`);
        setName(''); setUrl('https://'); setExpectBody('');
        await reload();
      } else {
        toast.error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(p: Probe) {
    setBusy(true);
    try {
      const params = new URLSearchParams({ _csrf: csrfToken, enabled: String(!p.enabled) });
      const res = await fetch(`/admin/api/probes/${p.id}/enabled?${params}`, { method: 'POST', credentials: 'include' });
      if (res.ok) { toast.success(p.enabled ? 'Disabled' : 'Enabled'); await reload(); }
      else        { toast.error('Toggle failed'); }
    } finally {
      setBusy(false);
    }
  }

  async function loadResults(id: number) {
    try {
      const res = await fetch(`/admin/api/probes/${id}/results?limit=60`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const body = await res.json();
      setResults(prev => ({ ...prev, [id]: body.results ?? [] }));
    } catch { /* ignore */ }
  }

  function toggleExpanded(id: number) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!results[id]) void loadResults(id);
    }
  }

  async function handleSaveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        _csrf: csrfToken,
        name:          editing.name,
        method:        editing.method,
        url:           editing.url,
        expectStatus:  String(editing.expectStatus),
        expectBody:    editing.expectBody ?? '',
        intervalMin:   String(editing.intervalMin),
        timeoutSec:    String(editing.timeoutSec),
        failThreshold: String(editing.failThreshold),
      });
      const res = await fetch(`/admin/api/probes/${editing.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const body = await res.json();
      if (res.ok) {
        toast.success('Probe updated');
        setEditing(null);
        await reload();
      } else {
        toast.error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(p: Probe) {
    if (!confirm(`Delete probe "${p.name}"? Result history will be removed too.`)) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ _csrf: csrfToken });
      const res = await fetch(`/admin/api/probes/${p.id}?${params}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { toast.success('Probe deleted'); await reload(); }
      else        { toast.error('Delete failed'); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="admin-card">
        <h2>Add probe</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 0.75rem' }}>
          <Field label="Name" full>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
                   placeholder="airlabs reachability" maxLength={80} required style={inputStyle} />
          </Field>
          <Field label="Method">
            <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
              <option>GET</option><option>POST</option><option>HEAD</option>
            </select>
          </Field>
          <Field label="Expected status">
            <input type="number" min={100} max={599} value={expectStatus}
                   onChange={e => setExpectStatus(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="URL" full>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                   placeholder="https://api.airlabs.co/api/v9/ping" maxLength={512} required
                   style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          </Field>
          <Field label="Expected body substring (optional)" full>
            <input type="text" value={expectBody} onChange={e => setExpectBody(e.target.value)}
                   placeholder="e.g. &quot;ok&quot; or empty for status-only check" maxLength={256} style={inputStyle} />
          </Field>
          <Field label="Interval (min)">
            <input type="number" min={1} max={1440} value={intervalMin}
                   onChange={e => setIntervalMin(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Timeout (sec)">
            <input type="number" min={1} max={60} value={timeoutSec}
                   onChange={e => setTimeoutSec(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Fail threshold (consecutive)" full>
            <input type="number" min={1} max={100} value={failThreshold}
                   onChange={e => setFailThreshold(e.target.value)} required style={{ ...inputStyle, maxWidth: 120 }} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={busy || !name.trim() || !url.trim()}
                    style={{ ...primaryButtonStyle, opacity: busy || !name.trim() ? 0.4 : 1 }}>
              {busy ? 'Saving…' : 'Add probe'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>All probes</h2>
        {probes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No probes registered yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name / URL</th>
                  <th style={thStyle}>Expect</th>
                  <th style={thStyle}>Interval</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {probes.map(p => {
                  const failing = p.consecFailures > 0;
                  const isExpanded = expanded === p.id;
                  return (
                    // Fragment with key — React needs the key here to
                    // diff the row + history pair correctly when probes
                    // are added/removed.
                    <Fragment key={p.id}>
                      <tr>
                        <td style={tdStyle}>
                          <button type="button" onClick={() => toggleExpanded(p.id)}
                                  title={isExpanded ? 'Hide history' : 'Show recent results'}
                                  style={expandButtonStyle}>
                            {isExpanded ? '▾' : '▸'} <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                          </button>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '1.1rem' }}>
                            {p.method} {p.url}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <code style={inlineCode}>{p.expectStatus}</code>
                          {p.expectBody && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>body⊃ {p.expectBody}</div>}
                        </td>
                        <td style={tdStyle}>{p.intervalMin}m / {p.timeoutSec}s</td>
                        <td style={tdStyle}>
                          {!p.enabled ? (
                            <Badge color="var(--text-muted)">Paused</Badge>
                          ) : failing ? (
                            <Badge color="var(--error)">{p.consecFailures} fail{p.consecFailures === 1 ? '' : 's'}</Badge>
                          ) : (
                            <Badge color="var(--success)">OK</Badge>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setEditing(p)} disabled={busy}
                                    style={smallButtonStyle('var(--info)')}>
                              Edit
                            </button>
                            <button type="button" onClick={() => void toggleEnabled(p)} disabled={busy}
                                    style={smallButtonStyle('var(--text-secondary)')}>
                              {p.enabled ? 'Pause' : 'Resume'}
                            </button>
                            <button type="button" onClick={() => void handleDelete(p)} disabled={busy}
                                    style={smallButtonStyle('var(--error)')}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} style={{ ...tdStyle, padding: 0 }}>
                            <ResultHistory results={results[p.id]} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <EditModal probe={editing} busy={busy}
                   onChange={p => setEditing(p)}
                   onCancel={() => setEditing(null)}
                   onSave={handleSaveEdit} />
      )}
    </>
  );
}

function ResultHistory({ results }: { results: Result[] | undefined }) {
  if (!results) {
    return <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Loading…</div>;
  }
  if (results.length === 0) {
    return <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No results yet.</div>;
  }
  // Compact strip of squares — green when ok, red when not. Hover shows
  // status / latency / timestamp. Newest on the right.
  const ordered = [...results].reverse();
  return (
    <div style={{
      padding: '0.6rem 0.85rem',
      background: 'var(--sunken)',
      borderTop: '1px dashed var(--border)',
    }}>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {ordered.map(r => (
          <span key={r.id}
                title={`${new Date(r.ran_at).toLocaleString()} · ${r.status_code ?? '—'} · ${r.latency_ms ?? '—'}ms${r.error ? ' · ' + r.error : ''}`}
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 16,
                  borderRadius: 1,
                  background: r.ok ? 'var(--success)' : 'var(--error)',
                  opacity: r.ok ? 0.8 : 0.95,
                }} />
        ))}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        Last {results.length} runs · {results.filter(r => r.ok).length} ok · {results.filter(r => !r.ok).length} failed ·
        avg latency {Math.round(results.filter(r => r.latency_ms != null).reduce((a, r) => a + (r.latency_ms ?? 0), 0) / Math.max(1, results.filter(r => r.latency_ms != null).length))}ms
      </div>
    </div>
  );
}

function EditModal({ probe, busy, onChange, onCancel, onSave }: {
  probe: Probe;
  busy: boolean;
  onChange: (p: Probe) => void;
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
}) {
  function set<K extends keyof Probe>(k: K, v: Probe[K]) {
    onChange({ ...probe, [k]: v });
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }} onClick={onCancel}>
      <form onSubmit={onSave} onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '1.25rem 1.5rem',
        maxWidth: 600,
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem 0.75rem',
      }}>
        <h3 style={{ margin: 0, gridColumn: '1 / -1', color: 'var(--primary-bright)' }}>Edit probe #{probe.id}</h3>
        <Field label="Name" full>
          <input type="text" value={probe.name} onChange={e => set('name', e.target.value)}
                 maxLength={80} required style={inputStyle} />
        </Field>
        <Field label="Method">
          <select value={probe.method} onChange={e => set('method', e.target.value)} style={inputStyle}>
            <option>GET</option><option>POST</option><option>HEAD</option>
          </select>
        </Field>
        <Field label="Expected status">
          <input type="number" min={100} max={599} value={probe.expectStatus}
                 onChange={e => set('expectStatus', Number(e.target.value))} required style={inputStyle} />
        </Field>
        <Field label="URL" full>
          <input type="url" value={probe.url} onChange={e => set('url', e.target.value)}
                 required style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8125rem' }} />
        </Field>
        <Field label="Expect body substring (optional)" full>
          <input type="text" value={probe.expectBody ?? ''} onChange={e => set('expectBody', e.target.value)}
                 maxLength={256} style={inputStyle} />
        </Field>
        <Field label="Interval (min)">
          <input type="number" min={1} max={1440} value={probe.intervalMin}
                 onChange={e => set('intervalMin', Number(e.target.value))} required style={inputStyle} />
        </Field>
        <Field label="Timeout (sec)">
          <input type="number" min={1} max={60} value={probe.timeoutSec}
                 onChange={e => set('timeoutSec', Number(e.target.value))} required style={inputStyle} />
        </Field>
        <Field label="Fail threshold" full>
          <input type="number" min={1} max={100} value={probe.failThreshold}
                 onChange={e => set('failThreshold', Number(e.target.value))} required
                 style={{ ...inputStyle, maxWidth: 120 }} />
        </Field>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" onClick={onCancel} disabled={busy} style={secondaryButtonStyle}>Cancel</button>
          <button type="submit" disabled={busy} style={primaryButtonStyle}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, full = false, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: full ? '1 / -1' : undefined }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'var(--font-heading)',
      fontSize: '0.625rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      padding: '2px 7px',
      borderRadius: 3,
    }}>{children}</span>
  );
}

const inlineCode = { color: 'var(--primary-bright)', background: 'var(--sunken)', padding: '1px 5px', borderRadius: 3, fontSize: '0.75rem' };
const fieldLabelStyle = { fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', fontWeight: 700 };
const inputStyle: React.CSSProperties = {
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0.5rem 0.75rem',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  width: '100%',
};
const primaryButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
  padding: '0.55rem 1.1rem',
  borderRadius: 4,
  cursor: 'pointer' as const,
};
const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  color: 'var(--text-primary)',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
};
const expandButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--text-muted)',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
};
function smallButtonStyle(color: string): React.CSSProperties {
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color,
    background: `color-mix(in srgb, ${color} 10%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
    padding: '0.3rem 0.65rem',
    borderRadius: 3,
    cursor: 'pointer' as const,
  };
}
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem' };
const thStyle = {
  textAlign: 'left' as const,
  padding: '0.4rem 0.5rem',
  borderBottom: '1px solid var(--border)',
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  fontWeight: 700,
};
const tdStyle = {
  padding: '0.5rem 0.5rem',
  borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
};
