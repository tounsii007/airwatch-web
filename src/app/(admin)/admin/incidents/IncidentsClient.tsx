/**
 * Client-side wrapper for the Incidents page (Phase 2.2). Handles:
 *   * "Open new incident" form
 *   * Close / postmortem-edit actions per row
 *   * Polling for live state every 30 s
 *
 * Lives in its own file so the page.tsx stays a clean server component
 * for the data fetch + initial render.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';
import { ClientTime } from '@/app/(admin)/ClientTime';
import { Markdown } from '@/app/(admin)/admin/shared/components/Markdown';

interface Incident {
  id: number;
  title: string;
  severity: string;
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  started_by: string;
  ended_by: string | null;
  summary: string | null;
  postmortem: string | null;
  linked_alerts: number;
}

interface Props {
  initialIncidents: Incident[];
  csrfToken: string;
}

export function IncidentsClient({ initialIncidents, csrfToken }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const toast = useToast();

  // Form for opening a new incident
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState('warning');
  const [newSummary, setNewSummary] = useState('');

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/incidents?limit=50', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const body = await res.json();
      setIncidents(body.incidents ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // Light polling — incidents don't change often, but a parallel
  // operator might open one from the alerts panel.
  useEffect(() => {
    const id = setInterval(() => void reload(), 30_000);
    return () => clearInterval(id);
  }, [reload]);

  async function handleOpen(ev: React.FormEvent) {
    ev.preventDefault();
    if (!newTitle.trim() || !csrfToken) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ title: newTitle.trim(), severity: newSeverity });
      if (newSummary.trim()) params.set('summary', newSummary.trim());
      const res = await fetch('/admin/api/incidents', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': csrfToken },
        body: params.toString(),
      });
      if (res.ok) {
        toast.success('Incident opened');
        setNewTitle(''); setNewSummary(''); setNewSeverity('warning');
        await reload();
      } else {
        toast.error(`HTTP ${res.status}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleClose(id: number) {
    if (!confirm('Close this incident?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/admin/api/incidents/${id}/close`, {
        method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) { toast.success('Closed'); await reload(); }
      else        { toast.error('Could not close'); }
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePostmortem(id: number) {
    setBusy(true);
    try {
      const params = new URLSearchParams({ postmortem: editText });
      const res = await fetch(`/admin/api/incidents/${id}/postmortem?${params}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) {
        toast.success('Postmortem saved');
        setEditing(null);
        await reload();
      } else {
        toast.error('Save failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="admin-card">
        <h2>Open new incident</h2>
        <form onSubmit={handleOpen} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem 0.75rem' }}>
          <Field label="Title" full>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                   placeholder="Database failover during deploy" maxLength={256} required style={inputStyle} />
          </Field>
          <Field label="Severity">
            <select value={newSeverity} onChange={e => setNewSeverity(e.target.value)} style={inputStyle}>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
          </Field>
          <Field label="Summary (optional)" full>
            <input type="text" value={newSummary} onChange={e => setNewSummary(e.target.value)}
                   placeholder="One-line description" maxLength={1024} style={inputStyle} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={busy || !newTitle.trim()}
                    style={{ ...primaryButtonStyle, opacity: busy || !newTitle.trim() ? 0.4 : 1 }}>
              Open incident
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>All incidents</h2>
        {incidents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No incidents yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {incidents.map(inc => {
              const open = !inc.ended_at;
              const accent = open ? 'var(--warning)' : 'var(--text-muted)';
              return (
                <article key={inc.id} style={{
                  borderLeft: `3px solid ${accent}`,
                  background: 'var(--sunken)',
                  borderRadius: 6,
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}>
                  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>
                        #{inc.id} · {inc.title}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
                        opened by {inc.started_by} · <ClientTime iso={inc.started_at} mode="relative" />
                        {inc.linked_alerts > 0 && <> · {inc.linked_alerts} linked alert{inc.linked_alerts === 1 ? '' : 's'}</>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <SeverityBadge sev={inc.severity} />
                      {open ? (
                        <Badge tone="warning" label="OPEN" />
                      ) : (
                        <Badge tone="muted" label={`CLOSED · ${inc.duration_min ?? 0} min`} />
                      )}
                    </div>
                  </header>

                  {inc.summary && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>{inc.summary}</p>
                  )}

                  {/* Postmortem block — read mode + inline edit */}
                  <div>
                    {editing === inc.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={6}
                          placeholder="What happened, what you did, follow-ups…"
                          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8125rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button type="button" onClick={() => void handleSavePostmortem(inc.id)} disabled={busy}
                                  style={primaryButtonStyle}>Save</button>
                          <button type="button" onClick={() => setEditing(null)} disabled={busy}
                                  style={secondaryButtonStyle}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {inc.postmortem ? (
                          // Rendered via the shared Markdown helper —
                          // headings, bullets, inline code/bold all
                          // styled consistently with the runbooks panel.
                          <div style={{
                            padding: '0.5rem 0.75rem',
                            background: 'var(--sunken)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                          }}>
                            <Markdown source={inc.postmortem} />
                          </div>
                        ) : (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: 0, fontStyle: 'italic' }}>No postmortem yet.</p>
                        )}
                        {csrfToken && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                            <button type="button" disabled={busy}
                                    onClick={() => { setEditing(inc.id); setEditText(inc.postmortem ?? ''); }}
                                    style={secondarySmallStyle}>
                              {inc.postmortem ? 'Edit postmortem' : 'Add postmortem'}
                            </button>
                            {open && (
                              <button type="button" disabled={busy}
                                      onClick={() => void handleClose(inc.id)}
                                      style={dangerSmallStyle}>
                                Close incident
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
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

function SeverityBadge({ sev }: { sev: string }) {
  const color = sev === 'critical' ? 'var(--error)' : sev === 'warning' ? 'var(--warning)' : 'var(--info)';
  return <Badge tone={sev === 'critical' ? 'error' : sev === 'warning' ? 'warning' : 'info'} label={sev.toUpperCase()} colorOverride={color} />;
}

function Badge({ tone, label, title, colorOverride }: { tone: 'info' | 'warning' | 'muted' | 'error'; label: string; title?: string; colorOverride?: string }) {
  const color = colorOverride
    ?? (tone === 'info' ? 'var(--info)' : tone === 'warning' ? 'var(--warning)' : tone === 'error' ? 'var(--error)' : 'var(--text-muted)');
  return (
    <span title={title} style={{
      fontSize: '0.6rem',
      letterSpacing: '0.08em',
      color,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      padding: '2px 7px',
      borderRadius: 3,
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      whiteSpace: 'nowrap' as const,
    }}>{label}</span>
  );
}

const fieldLabelStyle = { fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', fontWeight: 700 };
const inputStyle = {
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
const secondaryButtonStyle = {
  ...primaryButtonStyle,
  color: 'var(--text-primary)',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
};
const secondarySmallStyle = {
  ...secondaryButtonStyle,
  padding: '0.3rem 0.7rem',
  fontSize: '0.625rem',
};
const dangerSmallStyle = {
  ...secondarySmallStyle,
  color: 'var(--error)',
  background: 'color-mix(in srgb, var(--error) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 25%, transparent)',
};
