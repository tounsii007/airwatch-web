'use client';

/**
 * Webhook management table + create form. (Phase 5)
 *
 * Lists every registered outbound webhook with last-call status,
 * counters, and inline actions (test / enable / disable / delete).
 * New webhooks are created via the form at the bottom; the server
 * generates a fresh HMAC secret if the operator leaves the field
 * blank, and the full secret is shown once at create time so the
 * operator can paste it into the receiver's config.
 */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';
import { ClientTime } from '@/app/(admin)/ClientTime';

interface Webhook {
  id: number;
  name: string;
  url: string;
  secretMasked: string;
  kindFilter: string | null;
  severityFilter: string | null;
  enabled: boolean;
  createdAt: string | null;
  createdBy: string | null;
  lastCalledAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
  successCount: number;
  failureCount: number;
}

interface Delivery {
  id: number;
  alert_id: number | null;
  started_at: string;
  finished_at: string | null;
  attempt_count: number;
  status: number | null;
  latency_ms: number | null;
  ok: boolean;
  error: string | null;
}

interface TestOutcome {
  ok: boolean;
  status: number;
  latencyMs: number;
  attempts: number;
  error: string | null;
}

interface Props {
  initialWebhooks: Webhook[];
  csrfToken: string;
}

export function WebhooksClient({ initialWebhooks, csrfToken }: Props) {
  const [hooks, setHooks] = useState<Webhook[]>(initialWebhooks);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<Record<number, Delivery[]>>({});
  // Capture a freshly-created secret so the operator can copy it.
  const [revealedSecret, setRevealedSecret] = useState<{ id: number; secret: string } | null>(null);
  const toast = useToast();

  // Form state
  const [name, setName]                       = useState('');
  const [url, setUrl]                         = useState('https://');
  const [secret, setSecret]                   = useState('');
  const [kindFilter, setKindFilter]           = useState('');
  const [severityFilter, setSeverityFilter]   = useState('');

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/webhooks', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const body = (await res.json()) as Webhook[];
      setHooks(body);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => void reload(), 60_000);
    return () => clearInterval(id);
  }, [reload]);

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim() || !url.trim() || !csrfToken) return;
    setBusy(true);
    try {
      const res = await fetch(`/admin/api/webhooks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          secret: secret.trim() || undefined,
          kindFilter: kindFilter.trim() || undefined,
          severityFilter: severityFilter.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? `Create failed (${res.status})`);
        return;
      }
      const body = (await res.json()) as { id: number; secret: string };
      toast.success('Webhook created');
      setRevealedSecret({ id: body.id, secret: body.secret });
      // Reset form.
      setName(''); setUrl('https://'); setSecret('');
      setKindFilter(''); setSeverityFilter('');
      await reload();
    } catch (e) {
      toast.error(`Create failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnable(w: Webhook) {
    if (!csrfToken) return;
    const path = w.enabled ? 'disable' : 'enable';
    try {
      const res = await fetch(`/admin/api/webhooks/${w.id}/${path}`,
                              { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reload();
    } catch (e) {
      toast.error(`Toggle failed: ${(e as Error).message}`);
    }
  }

  async function fireTest(w: Webhook) {
    if (!csrfToken) return;
    try {
      const res = await fetch(`/admin/api/webhooks/${w.id}/test`,
                              { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const out = (await res.json()) as TestOutcome;
      if (out.ok) {
        toast.success(`Test OK · ${out.status} · ${out.latencyMs}ms · ${out.attempts} attempt(s)`);
      } else {
        toast.error(`Test failed · ${out.status} · ${out.error ?? '(no detail)'} · ${out.attempts} attempt(s)`);
      }
      await reload();
    } catch (e) {
      toast.error(`Test failed: ${(e as Error).message}`);
    }
  }

  async function remove(w: Webhook) {
    if (!csrfToken) return;
    if (!confirm(`Delete webhook "${w.name}"? Delivery history is dropped.`)) return;
    try {
      const res = await fetch(`/admin/api/webhooks/${w.id}`,
                              { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Deleted');
      await reload();
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`);
    }
  }

  async function toggleExpand(w: Webhook) {
    if (expanded === w.id) {
      setExpanded(null);
      return;
    }
    setExpanded(w.id);
    if (deliveries[w.id]) return;
    try {
      const res = await fetch(`/admin/api/webhooks/${w.id}/deliveries?limit=50`,
                              { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const body = (await res.json()) as Delivery[];
      setDeliveries(prev => ({ ...prev, [w.id]: body }));
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {revealedSecret && (
        <div style={revealStyle}>
          <strong>Save this secret now</strong> — it won't be shown again.
          Paste it into the receiver's config to validate the X-Airwatch-Signature.
          <pre style={secretBoxStyle}>{revealedSecret.secret}</pre>
          <button type="button" onClick={() => setRevealedSecret(null)}
                  style={dismissStyle}>Got it, dismiss</button>
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>URL</th>
            <th style={thStyle}>Filter</th>
            <th style={thStyle}>Last call</th>
            <th style={thStyle}>S/F</th>
            <th style={thStyle}>State</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {hooks.length === 0 ? (
            <tr><td colSpan={7} style={emptyStyle}>No webhooks registered. Create one below.</td></tr>
          ) : hooks.map(w => (
            <Fragment key={w.id}>
              <tr onClick={() => void toggleExpand(w)} style={rowStyle(w)}>
                <td style={tdStyle}>{w.name}</td>
                <td style={tdMonoStyle} title={w.url}>{truncate(w.url, 50)}</td>
                <td style={tdMonoStyle}>
                  {w.kindFilter && <span style={pillStyle}>kind: {w.kindFilter}</span>}
                  {w.severityFilter && <span style={pillStyle}>sev: {w.severityFilter}</span>}
                  {!w.kindFilter && !w.severityFilter && <span style={{ color: 'var(--text-muted)' }}>all</span>}
                </td>
                <td style={tdStyle}>
                  {w.lastCalledAt ? (
                    <>
                      <ClientTime iso={w.lastCalledAt} mode="relative" />
                      {w.lastStatus !== null && (
                        <span style={statusPill(w.lastStatus)}>{w.lastStatus}</span>
                      )}
                    </>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={tdMonoStyle}>
                  <span style={{ color: 'var(--success)' }}>{w.successCount}</span>
                  {' / '}
                  <span style={{ color: w.failureCount > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                    {w.failureCount}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={w.enabled ? enabledBadge : disabledBadge}>
                    {w.enabled ? 'ON' : 'OFF'}
                  </span>
                </td>
                <td style={tdStyle} onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => void fireTest(w)} style={btnStyle}
                          disabled={busy} title="Send a synthetic test payload to this URL">
                    Test
                  </button>{' '}
                  <button type="button" onClick={() => void toggleEnable(w)} style={btnStyle}
                          disabled={busy}>
                    {w.enabled ? 'Disable' : 'Enable'}
                  </button>{' '}
                  <button type="button" onClick={() => void remove(w)}
                          style={{ ...btnStyle, color: 'var(--error)' }}
                          disabled={busy}>
                    Delete
                  </button>
                </td>
              </tr>
              {expanded === w.id && (
                <tr>
                  <td colSpan={7} style={detailsStyle}>
                    <strong style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Recent deliveries
                    </strong>
                    {deliveries[w.id] === undefined ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Loading…</span>
                    ) : deliveries[w.id].length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(none yet)</span>
                    ) : (
                      <div style={deliveryGridStyle}>
                        <span style={dthStyle}>Started</span>
                        <span style={dthStyle}>Status</span>
                        <span style={dthStyle}>Latency</span>
                        <span style={dthStyle}>Attempts</span>
                        <span style={dthStyle}>Error</span>
                        {deliveries[w.id].map(d => (
                          <Fragment key={d.id}>
                            <ClientTime iso={d.started_at} mode="absolute" />
                            <span style={statusPill(d.status ?? 0)}>{d.status ?? '—'}</span>
                            <span>{d.latency_ms ?? '—'}ms</span>
                            <span>{d.attempt_count}</span>
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {d.error ?? '✓'}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <details>
        <summary style={summaryStyle}>+ Register new webhook</summary>
        <form onSubmit={handleCreate} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
                   placeholder="e.g. PagerDuty primary" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>URL</label>
            <input type="url" required value={url} onChange={e => setUrl(e.target.value)}
                   placeholder="https://events.pagerduty.com/integration/…" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Secret <span style={hintStyle}>(blank = generate 32-byte random)</span></label>
            <input type="text" value={secret} onChange={e => setSecret(e.target.value)}
                   placeholder="(generated)" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Kind filter <span style={hintStyle}>(regex, optional)</span></label>
            <input type="text" value={kindFilter} onChange={e => setKindFilter(e.target.value)}
                   placeholder="e.g. instance_down|synthetic_probe" style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Severity filter <span style={hintStyle}>(CSV: critical,warning)</span></label>
            <input type="text" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                   placeholder="e.g. critical" style={inputStyle} />
          </div>
          <button type="submit" disabled={busy} style={submitStyle}>
            {busy ? 'Creating…' : 'Create webhook'}
          </button>
        </form>
      </details>
    </section>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

// ── styles ─────────────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' };
const thStyle: React.CSSProperties    = { textAlign: 'left', padding: '6px 8px', fontFamily: 'var(--font-heading)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };
const tdStyle: React.CSSProperties    = { padding: '8px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };
const tdMonoStyle: React.CSSProperties = { ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' };
const emptyStyle: React.CSSProperties  = { padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' };

function rowStyle(w: Webhook): React.CSSProperties {
  return {
    cursor: 'pointer',
    opacity: w.enabled ? 1 : 0.55,
  };
}

const pillStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  background: 'var(--sunken)',
  padding: '1px 6px',
  borderRadius: 3,
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
};

function statusPill(status: number): React.CSSProperties {
  const ok = status >= 200 && status < 300;
  const tone = status === 0 ? 'var(--text-muted)'
             : ok ? 'var(--success)'
             : 'var(--error)';
  return {
    fontSize: '0.65rem',
    color: tone,
    background: `color-mix(in srgb, ${tone} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`,
    padding: '1px 6px',
    borderRadius: 3,
    marginLeft: 6,
  };
}

const enabledBadge: React.CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--success)',
  background: 'color-mix(in srgb, var(--success) 14%, transparent)',
  padding: '2px 6px',
  borderRadius: 3,
};
const disabledBadge: React.CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--text-muted)',
  background: 'var(--sunken)',
  padding: '2px 6px',
  borderRadius: 3,
};

const btnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: 'transparent',
  border: '1px solid var(--border)',
  padding: '3px 8px',
  borderRadius: 3,
  cursor: 'pointer',
  color: 'var(--text-secondary)',
};

const detailsStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'var(--sunken)',
  borderBottom: '1px solid var(--border)',
};

const deliveryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 70px 80px 80px 1fr',
  gap: '4px 12px',
  marginTop: 8,
  fontSize: '0.75rem',
};
const dthStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

const summaryStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--primary-bright)',
  cursor: 'pointer',
  padding: '8px 0',
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0.75rem',
  paddingTop: '0.5rem',
};
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-heading)',
  letterSpacing: '0.04em',
};
const hintStyle: React.CSSProperties = { color: 'var(--text-muted)', fontWeight: 'normal' };
const inputStyle: React.CSSProperties = {
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  padding: '6px 8px',
  borderRadius: 3,
  fontFamily: 'monospace',
  fontSize: '0.8125rem',
};
const submitStyle: React.CSSProperties = {
  ...btnStyle,
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  borderColor: 'color-mix(in srgb, var(--primary-bright) 28%, transparent)',
  alignSelf: 'end',
  padding: '8px 16px',
};

const revealStyle: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--warning) 14%, transparent)',
  border: '1px solid color-mix(in srgb, var(--warning) 32%, transparent)',
  padding: '12px',
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: '0.8125rem',
};
const secretBoxStyle: React.CSSProperties = {
  background: 'var(--sunken)',
  padding: '8px',
  borderRadius: 3,
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  margin: 0,
  userSelect: 'all',
  wordBreak: 'break-all',
};
const dismissStyle: React.CSSProperties = {
  ...btnStyle,
  color: 'var(--warning)',
  alignSelf: 'flex-start',
};
