/**
 * Operator UI for cron-based maintenance windows. (Phase 2.4)
 *
 * Lists existing schedules + a quick-add form. The backend
 * MaintenanceScheduler @-Scheduled job polls these every minute and
 * toggles maintenance mode automatically when a window opens / closes.
 *
 * <h3>Why a client component</h3>
 * Mutations (create / delete / enable-toggle) need to land without a
 * full page reload so the operator can iterate on cron expressions
 * quickly. The CSRF token is passed in from the server-rendered parent.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

interface Schedule {
  id: string;
  name: string;
  cron: string;
  durationMin: number;
  reason: string;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

interface ListResponse {
  total: number;
  schedules: Schedule[];
  activeId: string | null;
}

const PRESETS = [
  { label: 'Sun 02:00–04:00 (weekly)', cron: '0 0 2 * * SUN', durationMin: 120 },
  { label: 'Daily 03:00–04:00',        cron: '0 0 3 * * *',   durationMin: 60 },
  { label: '1st of month 02:00–06:00', cron: '0 0 2 1 * *',   durationMin: 240 },
];

export function MaintenanceSchedulesCard({ csrfToken }: { csrfToken: string }) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [cron, setCron] = useState('0 0 2 * * SUN');
  const [duration, setDuration] = useState('120');
  const [reason, setReason] = useState('');

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/maintenance/schedules', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim() || !cron.trim()) return;
    setBusy(true);
    try {
      const params = new URLSearchParams();
      params.set('name', name.trim());
      params.set('cron', cron.trim());
      params.set('durationMin', duration);
      if (reason.trim()) params.set('reason', reason.trim());
      const res = await fetch('/admin/api/maintenance/schedules', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': csrfToken },
        body: params.toString(),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? body.error ?? `HTTP ${res.status}`);
        return;
      }
      setName(''); setReason('');
      await reload();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'create failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    setBusy(true);
    try {
      const toggleParams = new URLSearchParams({ enabled: String(enabled) });
      await fetch(`/admin/api/maintenance/schedules/${encodeURIComponent(id)}/enabled?${toggleParams.toString()}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete schedule "${name}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/admin/api/maintenance/schedules/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card">
      <h2>Scheduled maintenance windows</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
        Cron-driven auto-toggle of maintenance mode. The scheduler polls every minute (Europe/Berlin).
        Use Spring 6-field cron: <code style={inlineCode}>second minute hour day month dayOfWeek</code>.
        The scheduler only auto-disables maintenance that <em>it</em> turned on — manual toggles stay yours.
      </p>

      {error && <Alert>{error}</Alert>}

      <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.75rem', marginBottom: '1rem' }}>
        <Field label="Name" full>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
                 placeholder="Sunday early-morning patch" maxLength={80} required style={inputStyle} />
        </Field>
        <Field label="Cron expression">
          <input type="text" value={cron} onChange={e => setCron(e.target.value)}
                 placeholder="0 0 2 * * SUN" required style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </Field>
        <Field label="Duration (minutes)">
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                 min={1} max={10080} required style={inputStyle} />
        </Field>
        <Field label="Reason (shown in 503 body)" full>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                 placeholder="Weekly patch window" maxLength={200} style={inputStyle} />
        </Field>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Presets:</span>
          {PRESETS.map(p => (
            <button key={p.label} type="button" onClick={() => { setCron(p.cron); setDuration(String(p.durationMin)); }}
                    style={presetButtonStyle}>{p.label}</button>
          ))}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" disabled={busy || !name.trim() || !cron.trim()}
                  style={{ ...primaryButtonStyle, opacity: busy || !name.trim() ? 0.4 : 1 }}>
            {busy ? 'Saving…' : 'Add schedule'}
          </button>
        </div>
      </form>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading…</p>
      ) : (data?.schedules.length ?? 0) === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No schedules yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Cron</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {data!.schedules.map(s => {
                const isActive = data!.activeId === s.id;
                return (
                  <tr key={s.id}>
                    <td style={tdStyle}>
                      <div style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                      {s.reason && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.reason}</div>}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.cron}</td>
                    <td style={tdStyle}>{s.durationMin} min</td>
                    <td style={tdStyle}>
                      {isActive ? (
                        <span style={{ ...badgeStyle, color: 'var(--warning)' }}>● ACTIVE NOW</span>
                      ) : s.enabled ? (
                        <span style={{ ...badgeStyle, color: 'var(--success)' }}>Armed</span>
                      ) : (
                        <span style={{ ...badgeStyle, color: 'var(--text-muted)' }}>Paused</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => void handleToggle(s.id, !s.enabled)}
                                disabled={busy} style={smallButtonStyle('var(--text-muted)')}>
                          {s.enabled ? 'Pause' : 'Resume'}
                        </button>
                        <button type="button" onClick={() => void handleDelete(s.id, s.name)}
                                disabled={busy} style={smallButtonStyle('var(--error)')}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
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

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '0.5rem 0.75rem',
      borderRadius: 4,
      color: 'var(--error)',
      background: 'color-mix(in srgb, var(--error) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--error) 28%, transparent)',
      fontSize: '0.8125rem',
      marginBottom: '0.75rem',
    }}>{children}</div>
  );
}

const inlineCode = { color: 'var(--primary-bright)', fontSize: '0.75rem', background: 'var(--sunken)', padding: '1px 6px', borderRadius: 3 };
const fieldLabelStyle = { fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', fontWeight: 700 };
const inputStyle = {
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0.5rem 0.75rem',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
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
const presetButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  color: 'var(--text-secondary)',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  padding: '0.25rem 0.55rem',
  borderRadius: 3,
  cursor: 'pointer' as const,
};
function smallButtonStyle(color: string): React.CSSProperties {
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color,
    background: `color-mix(in srgb, ${color} 10%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
    padding: '0.3rem 0.65rem',
    borderRadius: 3,
    cursor: 'pointer' as const,
  };
}
const badgeStyle = { fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontWeight: 700 };
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
