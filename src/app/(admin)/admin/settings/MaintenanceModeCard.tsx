/**
 * Operator UI for the cluster-wide maintenance flag.
 *
 * Shown on the Settings page. Two states:
 *   * INACTIVE → form to ENABLE with optional reason input
 *   * ACTIVE   → "since" + "by" + "reason" + DISABLE button
 *
 * Both forms POST to the existing AdminController endpoints
 * (`/admin/maintenance/enable` + `/admin/maintenance/disable`) with
 * a hidden _csrf input. AdminController sendRedirects to
 * `/admin/dashboard?success=maintenance_on|off`; the operator lands
 * on the dashboard with the maintenance banner now visible (or gone).
 */

import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';

interface MaintenanceStatus {
  active: boolean;
  reason: string | null;
  sinceMs: number | null;
  by: string | null;
}

interface Props {
  csrfToken: string;
}

export async function MaintenanceModeCard({ csrfToken }: Props) {
  const status = await fetchJson<MaintenanceStatus>('/admin/api/maintenance');
  const active = status?.active ?? false;
  const since = status?.sinceMs ? new Date(status.sinceMs) : null;

  return (
    <section className="admin-card">
      <h2>Maintenance mode</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
        While ON, every PUBLIC API request returns <strong>503 Service Unavailable</strong> with a
        Retry-After header. Admin endpoints stay reachable so you can toggle it back. Use this
        before deploys or DB migrations to drain client traffic.
      </p>

      {active ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
            background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
            borderLeft: '3px solid var(--warning)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              color: 'var(--warning)',
              padding: '2px 8px',
              background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--warning) 28%, transparent)',
              borderRadius: 3,
            }}>
              ACTIVE
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
              {status?.reason || '— no reason provided —'}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Since {since?.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) ?? 'unknown'}
            {status?.by && <span> · activated by {status.by}</span>}
          </div>
          {csrfToken && (
            <form method="post" action="/admin/maintenance/disable" style={{ marginTop: '0.25rem' }}>
              <input type="hidden" name="_csrf" value={csrfToken} />
              <button type="submit" style={primaryButtonStyle}>Disable maintenance mode</button>
            </form>
          )}
        </div>
      ) : (
        csrfToken && (
          <form method="post" action="/admin/maintenance/enable" style={formColStyle}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={fieldLabelStyle}>Reason (shown to clients in the 503 body)</span>
              <input
                name="reason"
                type="text"
                placeholder="Database migration in progress…"
                maxLength={200}
                style={inputStyle}
              />
            </label>
            <button type="submit" style={dangerButtonStyle}>Enable maintenance mode</button>
          </form>
        )
      )}
    </section>
  );
}

const formColStyle = {
  display: 'flex' as const,
  flexDirection: 'column' as const,
  gap: '0.75rem',
  maxWidth: 480,
};
const fieldLabelStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  fontWeight: 700,
};
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
  color: 'var(--success)',
  background: 'color-mix(in srgb, var(--success) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--success) 28%, transparent)',
  padding: '0.6rem 1.25rem',
  borderRadius: 4,
  cursor: 'pointer',
  alignSelf: 'flex-start' as const,
};
const dangerButtonStyle = {
  ...primaryButtonStyle,
  color: 'var(--warning)',
  background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--warning) 28%, transparent)',
};
