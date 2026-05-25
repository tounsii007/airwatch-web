'use client';

/**
 * Live alert log — polls /admin/api/monitoring/alerts every 30 s and
 * renders rows newest-first. Each alert carries a severity tone, a
 * delivery indicator (✉ email sent vs ⊘ throttled / failed) and a
 * one-line title.
 *
 * <h3>Lifecycle (Phase 2.1)</h3>
 * Each row exposes inline Ack / Snooze / Mute buttons that POST to
 * /admin/api/alerts/{id}/* with the live CSRF token. After a mutation
 * we re-poll immediately so the row's badge state updates without
 * waiting for the next 30 s tick.
 *
 * Sits on the dashboard alongside the LiveFeed — LiveFeed shows raw
 * blocked-request events as they happen; AlertsPanel shows the
 * curated cross-cutting events the AdminAlertingService has decided
 * are worth notifying on (instance failure, attack threshold,
 * critical error escalation).
 */
import { Fragment, useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';
import { useLiveData } from '@/app/(admin)/admin/shared/live/useLiveData';
import { LiveWidgetHeader } from '@/app/(admin)/admin/shared/live/LiveWidgetHeader';
import { useAdminEvents } from '@/app/(admin)/admin/shared/live/AdminEventStream';

interface AlertRow {
  id: number;
  fired_at: string;
  kind: string;
  severity: 'info' | 'warning' | 'critical';
  target: string;
  title: string;
  email_sent: boolean;
  email_error: string | null;
  // Lifecycle fields (Phase 2.1) — optional in case an old row predates V10.
  ack_at?: string | null;
  ack_by?: string | null;
  snooze_until?: string | null;
  was_muted?: boolean;
  incident_id?: number | null;
  // Phase 4 — fingerprint + grouping. When the panel is in grouped mode,
  // this row represents the most-recent alert in the group; group_count
  // is the total within the window. In flat mode group_count is absent
  // and these rows are individual alerts.
  fingerprint?: string | null;
  group_count?: number;
  first_in_group_at?: string;
  last_in_group_at?: string;
}

const REFRESH_MS = 30_000;

const SEV_TONE: Record<string, string> = {
  critical: 'var(--error)',
  warning:  'var(--warning)',
  info:     'var(--info)',
};

interface Props {
  /** Initial CSRF token rendered server-side. Can be empty if unavailable; action buttons hide. */
  csrfToken?: string;
}

export function AlertsPanel({ csrfToken = '' }: Props) {
  const toast = useToast();
  // Live-data subscription (Phase 4 dynamic). Auto-refreshes every 30s,
  // pauses when tab hidden, listens to the global "Refresh all" event,
  // and exposes a per-widget refresh button via LiveWidgetHeader below.
  // The optimistic `mutate()` lets row-level Ack/Snooze/Mute flip the
  // badge instantly — no 100-300 ms "stale" gap waiting for the next
  // poll. SWR rolls the cache back automatically if the writer throws.
  // Phase 4 — grouped view (default) collapses repeats into one leader
  // row per fingerprint. Operators can toggle to flat for forensic
  // detail. The toggle persists for the page lifetime; we don't store
  // it in localStorage because reload context (incident vs steady-state)
  // changes which view is more useful.
  const [groupedView, setGroupedView] = useState(true);
  const alertsUrl = groupedView
    ? '/admin/api/monitoring/alerts/grouped?limit=20'
    : '/admin/api/monitoring/alerts?limit=20';
  const live = useLiveData<AlertRow[]>(alertsUrl, {
    intervalMs: REFRESH_MS,
  });
  const rows = live.data;
  const refresh = live.refresh;

  // Per-fingerprint expanded state — independent from selectMode. Maps
  // fingerprint → fetched member array (null = loading; undefined = not
  // expanded). Lazy fetch keeps the panel light when nothing is
  // expanded.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, AlertRow[] | null>>({});
  async function toggleGroup(fp: string | null | undefined) {
    if (!fp) return;
    setExpandedGroups(prev => {
      // Clicking again collapses.
      if (fp in prev) {
        const next = { ...prev };
        delete next[fp];
        return next;
      }
      return { ...prev, [fp]: null };
    });
    try {
      const res = await fetch(`/admin/api/monitoring/alerts/group/${encodeURIComponent(fp)}?limit=50`,
                              { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('group fetch failed');
      const body = (await res.json()) as AlertRow[];
      setExpandedGroups(prev => (fp in prev ? { ...prev, [fp]: body } : prev));
    } catch {
      toast.error('Could not fetch group members');
      setExpandedGroups(prev => {
        const next = { ...prev };
        delete next[fp];
        return next;
      });
    }
  }

  // Phase 4 — SSE push. The 30 s polling stays as a safety net (in case
  // the SSE connection drops or an alert lands during a brief reconnect)
  // but the typical path is now: api inserts row → SSE event → here we
  // call refresh() within ~50 ms instead of waiting up to 30 s.
  useAdminEvents('alert.fired',   () => { void refresh(); });
  useAdminEvents('alert.updated', () => { void refresh(); });

  /** Build the optimistic next-state for one alert, leaving the rest. */
  function patchRow(id: number, patch: Partial<AlertRow>): AlertRow[] {
    return (rows ?? []).map(r => (r.id === id ? { ...r, ...patch } : r));
  }

  /** Build the optimistic next-state for many alerts in one shot. */
  function patchRows(ids: ReadonlySet<number>, patch: Partial<AlertRow>): AlertRow[] {
    return (rows ?? []).map(r => (ids.has(r.id) ? { ...r, ...patch } : r));
  }

  // Phase 3 — multi-row selection + bulk actions. Operators see this
  // as a "Select" toggle next to the refresh button; clicking it
  // reveals checkboxes per row and a bulk-action bar above the list.
  const [selectMode, setSelectMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }
  function selectAll() {
    const ackable = (rows ?? []).filter(r => !r.ack_at).map(r => r.id);
    setSelectedIds(new Set(ackable));
  }

  /**
   * Bulk-ack: fire N parallel ack POSTs, single optimistic patch
   * covering every selected row. SWR sees one mutate(), one cache
   * patch, one revalidate — much cheaper than per-row sequential
   * round-trips. On any failure the entire bar rolls back.
   */
  async function bulkAck() {
    if (!csrfToken || selectedIds.size === 0) return;
    const ids = new Set(selectedIds);
    const optimistic = patchRows(ids, {
      ack_at: new Date().toISOString(),
      ack_by: 'you',
    });
    try {
      await live.mutate(async () => {
        await Promise.all([...ids].map(id => {
          const params = new URLSearchParams({ _csrf: csrfToken });
          return fetch(`/admin/api/alerts/${id}/ack?${params}`, { method: 'POST', credentials: 'include' });
        }));
      }, { optimisticData: optimistic });
      toast.success(`Acknowledged ${ids.size}`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Bulk-ack failed — some alerts may have succeeded');
    }
  }

  async function bulkSnooze(minutes: number) {
    if (!csrfToken || selectedIds.size === 0) return;
    const ids = new Set(selectedIds);
    const optimistic = patchRows(ids, {
      snooze_until: new Date(Date.now() + minutes * 60_000).toISOString(),
    });
    try {
      await live.mutate(async () => {
        await Promise.all([...ids].map(id => {
          const params = new URLSearchParams({ _csrf: csrfToken, minutes: String(minutes) });
          return fetch(`/admin/api/alerts/${id}/snooze?${params}`, { method: 'POST', credentials: 'include' });
        }));
      }, { optimisticData: optimistic });
      toast.success(`Snoozed ${ids.size} for ${minutes}min`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Bulk-snooze failed');
    }
  }

  async function ack(id: number) {
    if (!csrfToken) return;
    const params = new URLSearchParams({ _csrf: csrfToken });
    // Optimistic patch: set ack_at to now so `acked` flips true and the
    // row dims + ACK badge appears the instant the operator clicks.
    const optimistic = patchRow(id, {
      ack_at: new Date().toISOString(),
      ack_by: 'you',
    });
    try {
      await live.mutate(async () => {
        const res = await fetch(`/admin/api/alerts/${id}/ack?${params}`, { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('ack failed');
      }, { optimisticData: optimistic });
      toast.success('Acknowledged');
    } catch {
      toast.error('Could not acknowledge');
    }
  }

  async function snooze(id: number, minutes: number) {
    if (!csrfToken) return;
    const params = new URLSearchParams({ _csrf: csrfToken, minutes: String(minutes) });
    const optimistic = patchRow(id, {
      snooze_until: new Date(Date.now() + minutes * 60_000).toISOString(),
    });
    try {
      await live.mutate(async () => {
        const res = await fetch(`/admin/api/alerts/${id}/snooze?${params}`, { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('snooze failed');
      }, { optimisticData: optimistic });
      toast.success(`Snoozed ${minutes}min`);
    } catch {
      toast.error('Snooze failed');
    }
  }

  async function unsnooze(id: number) {
    if (!csrfToken) return;
    const params = new URLSearchParams({ _csrf: csrfToken });
    const optimistic = patchRow(id, { snooze_until: null });
    try {
      await live.mutate(async () => {
        const res = await fetch(`/admin/api/alerts/${id}/unsnooze?${params}`, { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('unsnooze failed');
      }, { optimisticData: optimistic });
      toast.success('Snooze cleared');
    } catch {
      toast.error('Could not clear snooze');
    }
  }

  async function mute(kind: string, target: string) {
    if (!csrfToken) return;
    const reason = prompt(`Mute reason for ${kind} (optional)`, '');
    if (reason === null) return;
    const params = new URLSearchParams({ _csrf: csrfToken, kind, target, reason });
    // Mark every matching kind+target row as muted right away.
    const optimistic = (rows ?? []).map(r =>
      r.kind === kind && r.target === target ? { ...r, was_muted: true } : r,
    );
    try {
      await live.mutate(async () => {
        const res = await fetch(`/admin/api/alerts/mutes?${params}`, { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('mute failed');
      }, { optimisticData: optimistic });
      toast.success('Muted');
    } catch {
      toast.error('Mute failed');
    }
  }

  return (
    <section className="admin-card">
      <LiveWidgetHeader
        title="Alerts"
        subtitle={
          rows === null ? 'Loading…'
          : rows.length === 0 ? 'No alerts — quiet day'
          : `${rows.length} recent`
        }
        loading={live.loading}
        lastUpdatedMs={live.lastUpdatedMs}
        onRefresh={() => void refresh()}
        right={
          <span style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => setGroupedView(v => !v)}
              style={selectToggleStyle(groupedView)}
              title={groupedView
                ? 'Showing one row per fingerprint group (click for flat view)'
                : 'Showing every alert (click for grouped view)'}
            >
              {groupedView ? '⊞ Grouped' : '☰ Flat'}
            </button>
            {csrfToken && rows && rows.length > 0 && (
              <button
                type="button"
                onClick={() => { setSelectMode(s => !s); clearSelection(); }}
                style={selectToggleStyle(selectMode)}
                title="Bulk-select alerts to ack/snooze in one operation"
              >
                {selectMode ? '✕ Cancel select' : '☑ Select'}
              </button>
            )}
          </span>
        }
      />

      {selectMode && rows && rows.length > 0 && (
        <div style={bulkBarStyle}>
          <span><strong>{selectedIds.size}</strong> selected</span>
          <button type="button" onClick={selectAll} style={bulkSecondaryButton}>Select all unacked</button>
          <button type="button" onClick={clearSelection} style={bulkSecondaryButton}>Clear</button>
          {selectedIds.size > 0 && (
            <>
              <button type="button" onClick={() => void bulkAck()} style={bulkPrimaryButton}>
                ✓ Ack {selectedIds.size}
              </button>
              <button type="button" onClick={() => void bulkSnooze(60)} style={bulkPrimaryButton}>
                ⏱ Snooze 1h
              </button>
              <button type="button" onClick={() => void bulkSnooze(60 * 24)} style={bulkPrimaryButton}>
                ⏱ Snooze 24h
              </button>
            </>
          )}
        </div>
      )}

      {rows && rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 380, overflow: 'auto' }}>
          {rows.map((a) => {
            const isExpanded = !!a.fingerprint && a.fingerprint in expandedGroups;
            const members = a.fingerprint ? expandedGroups[a.fingerprint] : undefined;
            const expandable = groupedView && (a.group_count ?? 1) > 1 && !!a.fingerprint;
            // Stable key includes the mutable fields React's diff cares
            // about. After an ACK or snooze, the row's id is unchanged but
            // its visual identity isn't — a plain id key let React reuse
            // the same Fragment for a now-different row and skip remount,
            // which can flash stale text into the new row's slot during
            // animation. Threading ack_at + snooze_until into the key
            // forces a clean remount on mutation.
            const stableKey = `${a.id}:${a.ack_at ?? 'u'}:${a.snooze_until ?? 'u'}`;
            return (
              <Fragment key={stableKey}>
                <AlertRow
                  alert={a}
                  canAct={!!csrfToken}
                  selectMode={selectMode}
                  selected={selectedIds.has(a.id)}
                  expandable={expandable}
                  expanded={isExpanded}
                  onToggleExpand={() => void toggleGroup(a.fingerprint)}
                  onToggleSelect={() => toggleSelect(a.id)}
                  onAck={() => void ack(a.id)}
                  onSnooze={(m) => void snooze(a.id, m)}
                  onUnsnooze={() => void unsnooze(a.id)}
                  onMute={() => void mute(a.kind, a.target)}
                />
                {isExpanded && (
                  <div style={groupExpandStyle}>
                    {members === null
                      ? <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Loading group…</span>
                      : (members ?? []).slice(1).length === 0
                        ? <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>(only one alert in group)</span>
                        : (members ?? []).slice(1).map(m => (
                            <div key={m.id} style={groupMemberStyle}>
                              <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                {new Date(m.fired_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                                {m.title}
                              </span>
                            </div>
                          ))}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
          {rows === null ? 'Loading alerts…' : 'No alerts in window.'}
        </p>
      )}
    </section>
  );
}

function selectToggleStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    letterSpacing: '0.05em',
    color: active ? 'var(--primary-bright)' : 'var(--text-secondary)',
    background: active
      ? 'color-mix(in srgb, var(--primary-bright) 14%, transparent)'
      : 'var(--sunken)',
    border: `1px solid ${active
      ? 'color-mix(in srgb, var(--primary-bright) 32%, transparent)'
      : 'var(--border)'}`,
    padding: '0.25rem 0.6rem',
    borderRadius: 3,
    cursor: 'pointer',
  };
}

const bulkBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  marginBottom: '0.5rem',
  background: 'color-mix(in srgb, var(--primary-bright) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 22%, transparent)',
  borderRadius: 4,
  fontSize: '0.75rem',
  flexWrap: 'wrap',
};
const bulkSecondaryButton: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  background: 'transparent',
  border: '1px solid var(--border)',
  padding: '0.25rem 0.5rem',
  borderRadius: 3,
  cursor: 'pointer',
};
const bulkPrimaryButton: React.CSSProperties = {
  ...bulkSecondaryButton,
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  borderColor: 'color-mix(in srgb, var(--primary-bright) 28%, transparent)',
};

/** Phase 4 — group-count pill rendered inline next to the title. */
function groupCountBadge(expanded: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.6rem',
    letterSpacing: '0.08em',
    color: expanded ? 'var(--primary-bright)' : 'var(--text-secondary)',
    background: expanded
      ? 'color-mix(in srgb, var(--primary-bright) 14%, transparent)'
      : 'var(--sunken)',
    border: `1px solid ${expanded
      ? 'color-mix(in srgb, var(--primary-bright) 32%, transparent)'
      : 'var(--border)'}`,
    padding: '1px 6px',
    borderRadius: 3,
    cursor: 'pointer',
    minWidth: 'fit-content',
  };
}

/** Phase 4 — container for inline-expanded group members. */
const groupExpandStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '4px 8px 8px 16px',
  marginLeft: 12,
  borderLeft: '2px solid color-mix(in srgb, var(--primary-bright) 24%, transparent)',
};

const groupMemberStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '70px 1fr',
  gap: 8,
  fontSize: '0.7rem',
  padding: '2px 4px',
};

function AlertRow({ alert, canAct, selectMode, selected, expandable, expanded, onToggleExpand, onToggleSelect, onAck, onSnooze, onUnsnooze, onMute }: {
  alert: AlertRow;
  canAct: boolean;
  selectMode: boolean;
  selected: boolean;
  /** Phase 4 — true when this is a grouped leader and the group has > 1 alerts. */
  expandable: boolean;
  /** True when the group is currently expanded inline. */
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onAck: () => void;
  onSnooze: (minutes: number) => void;
  onUnsnooze: () => void;
  onMute: () => void;
}) {
  const tone   = SEV_TONE[alert.severity] ?? 'var(--text-muted)';
  const acked  = !!alert.ack_at;
  const snoozedUntil = alert.snooze_until ? new Date(alert.snooze_until) : null;
  const snoozed = snoozedUntil != null && snoozedUntil.getTime() > Date.now();
  const muted   = !!alert.was_muted;

  return (
    <div
      style={{
        display: 'grid',
        // In select-mode an extra checkbox column is prepended.
        gridTemplateColumns: selectMode ? '24px 70px 80px 1fr auto auto' : '70px 80px 1fr auto auto',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        borderLeft: `3px solid ${tone}`,
        background: selected
          ? 'color-mix(in srgb, var(--primary-bright) 8%, var(--sunken))'
          : 'var(--sunken)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-heading)',
        opacity: acked ? 0.55 : 1,
      }}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          disabled={acked}
          aria-label={`Select alert ${alert.id}`}
          title={acked ? 'Already acknowledged' : 'Select for bulk action'}
        />
      )}
      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {new Date(alert.fired_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span
        style={{
          fontSize: '0.625rem',
          color: tone,
          background: `color-mix(in srgb, ${tone} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${tone} 22%, transparent)`,
          padding: '1px 6px',
          borderRadius: 3,
          textAlign: 'center',
          letterSpacing: '0.08em',
        }}
      >
        {alert.severity}
      </span>
      <span
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.8125rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        title={`${alert.kind} · ${alert.target}${alert.fingerprint ? ` · fp=${alert.fingerprint}` : ''}`}
      >
        {alert.title}
        {expandable && (
          <button
            type="button"
            onClick={onToggleExpand}
            title={expanded ? 'Collapse group' : `${alert.group_count} alerts in this group — click to expand`}
            style={groupCountBadge(expanded)}
          >
            {expanded ? '▾' : '▸'} ×{alert.group_count}
          </button>
        )}
        {acked && <Badge tone="muted" label={`ACK ${alert.ack_by ?? ''}`} title={`Acked at ${alert.ack_at}`} />}
        {snoozed && <Badge tone="info" label="SNOOZED" title={`Until ${snoozedUntil!.toLocaleString()}`} />}
        {muted && <Badge tone="muted" label="MUTED" />}
        {alert.incident_id && <Badge tone="warning" label={`#${alert.incident_id}`} title="Linked to incident" />}
      </span>
      <span
        style={{ fontSize: '0.625rem', color: alert.email_sent ? 'var(--success)' : 'var(--text-muted)' }}
        title={alert.email_sent ? 'Email sent' : alert.email_error ? `Email failed: ${alert.email_error}` : 'Throttled / SMTP off'}
      >
        {alert.email_sent ? '✉' : '⊘'}
      </span>
      {canAct && (
        <span style={{ display: 'flex', gap: 4 }}>
          {!acked && (
            <ActionButton title="Acknowledge" onClick={onAck}>✓</ActionButton>
          )}
          {!snoozed ? (
            <ActionButton title="Snooze this kind+target for 1 hour" onClick={() => onSnooze(60)}>⏱</ActionButton>
          ) : (
            <ActionButton title="Cancel snooze for this kind+target" onClick={onUnsnooze}>↺</ActionButton>
          )}
          {!muted && (
            <ActionButton title="Mute kind+target permanently" onClick={onMute}>⊗</ActionButton>
          )}
        </span>
      )}
    </div>
  );
}

function Badge({ tone, label, title }: { tone: 'info' | 'warning' | 'muted'; label: string; title?: string }) {
  const color = tone === 'info' ? 'var(--info)' : tone === 'warning' ? 'var(--warning)' : 'var(--text-muted)';
  return (
    <span title={title} style={{
      fontSize: '0.55rem',
      letterSpacing: '0.08em',
      color,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      padding: '1px 5px',
      borderRadius: 3,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function ActionButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: 'var(--sunken)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        padding: '2px 7px',
        fontSize: '0.7rem',
        cursor: 'pointer',
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}
