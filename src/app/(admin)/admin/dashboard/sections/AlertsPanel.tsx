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
import { useToast } from '@/app/(admin)/Toast';
import { useLiveData } from '@/app/(admin)/admin/shared/live/useLiveData';
import { LiveWidgetHeader } from '@/app/(admin)/admin/shared/live/LiveWidgetHeader';

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
  const live = useLiveData<AlertRow[]>('/admin/api/monitoring/alerts?limit=20', {
    intervalMs: REFRESH_MS,
  });
  const rows = live.data;
  const refresh = live.refresh;

  async function ack(id: number) {
    if (!csrfToken) return;
    const params = new URLSearchParams({ _csrf: csrfToken });
    const res = await fetch(`/admin/api/alerts/${id}/ack?${params}`, { method: 'POST', credentials: 'include' });
    if (res.ok) { toast.success('Acknowledged'); void refresh(); }
    else        { toast.error('Could not acknowledge'); }
  }

  async function snooze(id: number, minutes: number) {
    if (!csrfToken) return;
    const params = new URLSearchParams({ _csrf: csrfToken, minutes: String(minutes) });
    const res = await fetch(`/admin/api/alerts/${id}/snooze?${params}`, { method: 'POST', credentials: 'include' });
    if (res.ok) { toast.success(`Snoozed ${minutes}min`); void refresh(); }
    else        { toast.error('Snooze failed'); }
  }

  async function unsnooze(id: number) {
    if (!csrfToken) return;
    const params = new URLSearchParams({ _csrf: csrfToken });
    const res = await fetch(`/admin/api/alerts/${id}/unsnooze?${params}`, { method: 'POST', credentials: 'include' });
    if (res.ok) { toast.success('Snooze cleared'); void refresh(); }
    else        { toast.error('Could not clear snooze'); }
  }

  async function mute(kind: string, target: string) {
    if (!csrfToken) return;
    const reason = prompt(`Mute reason for ${kind} (optional)`, '');
    if (reason === null) return;
    const params = new URLSearchParams({ _csrf: csrfToken, kind, target, reason });
    const res = await fetch(`/admin/api/alerts/mutes?${params}`, { method: 'POST', credentials: 'include' });
    if (res.ok) { toast.success('Muted'); void refresh(); }
    else        { toast.error('Mute failed'); }
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
      />

      {rows && rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 380, overflow: 'auto' }}>
          {rows.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              canAct={!!csrfToken}
              onAck={() => void ack(a.id)}
              onSnooze={(m) => void snooze(a.id, m)}
              onUnsnooze={() => void unsnooze(a.id)}
              onMute={() => void mute(a.kind, a.target)}
            />
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
          {rows === null ? 'Loading alerts…' : 'No alerts in window.'}
        </p>
      )}
    </section>
  );
}

function AlertRow({ alert, canAct, onAck, onSnooze, onUnsnooze, onMute }: {
  alert: AlertRow;
  canAct: boolean;
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
        gridTemplateColumns: '70px 80px 1fr auto auto',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        borderLeft: `3px solid ${tone}`,
        background: 'var(--sunken)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-heading)',
        opacity: acked ? 0.55 : 1,
      }}
    >
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
        title={`${alert.kind} · ${alert.target}`}
      >
        {alert.title}
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
