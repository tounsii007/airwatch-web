'use client';

/**
 * Live alert log — polls /admin/api/monitoring/alerts every 30 s and
 * renders rows newest-first. Each alert carries a severity tone, a
 * delivery indicator (✉ email sent vs ⊘ throttled / failed) and a
 * one-line title.
 *
 * Sits on the dashboard alongside the LiveFeed — LiveFeed shows raw
 * blocked-request events as they happen; AlertsPanel shows the
 * curated cross-cutting events the AdminAlertingService has decided
 * are worth notifying on (instance failure, attack threshold,
 * critical error escalation).
 */
import { useEffect, useState } from 'react';

interface AlertRow {
  id: number;
  fired_at: string;
  kind: string;
  severity: 'info' | 'warning' | 'critical';
  target: string;
  title: string;
  email_sent: boolean;
  email_error: string | null;
}

const REFRESH_MS = 30_000;

const SEV_TONE: Record<string, string> = {
  critical: 'var(--error)',
  warning:  'var(--warning)',
  info:     'var(--info)',
};

export function AlertsPanel() {
  const [rows, setRows] = useState<AlertRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch('/admin/api/monitoring/alerts?limit=20', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as AlertRow[];
        if (!cancelled) setRows(data);
      } catch {
        // Network blip — next tick will retry.
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
          <h2 style={{ marginBottom: 4 }}>Alerts</h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {rows === null ? 'Loading…' : rows.length === 0 ? 'No alerts yet — quiet day' : `${rows.length} recent`}
          </span>
        </div>
      </header>

      {rows && rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 380, overflow: 'auto' }}>
          {rows.map((a) => <AlertRow key={a.id} alert={a} />)}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
          {rows === null ? 'Loading alerts…' : 'No alerts in window.'}
        </p>
      )}
    </section>
  );
}

function AlertRow({ alert }: { alert: AlertRow }) {
  const tone = SEV_TONE[alert.severity] ?? 'var(--text-muted)';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '70px 80px 1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        borderLeft: `3px solid ${tone}`,
        background: 'rgba(15, 29, 50, 0.4)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-heading)',
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
        }}
        title={`${alert.kind} · ${alert.target}`}
      >
        {alert.title}
      </span>
      <span
        style={{ fontSize: '0.625rem', color: alert.email_sent ? 'var(--success)' : 'var(--text-muted)' }}
        title={alert.email_sent ? 'Email sent' : alert.email_error ? `Email failed: ${alert.email_error}` : 'Throttled / SMTP off'}
      >
        {alert.email_sent ? '✉' : '⊘'}
      </span>
    </div>
  );
}
