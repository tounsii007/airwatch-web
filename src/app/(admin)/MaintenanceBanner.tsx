/**
 * Cluster-wide "maintenance mode is ON" banner.
 *
 * Server-rendered into the admin layout; reads the maintenance state
 * from {@code /admin/api/maintenance} and shows a sticky bar at the top
 * of the admin frame whenever the flag is set. Stays out of the way
 * (returns null) during normal operation.
 *
 * Why server-rendered: the admin layout already does a server-side
 * fetch for auth + CSRF, so adding a 60-byte status read is free. Having
 * this in SSR means the banner is part of the first paint, not a flash
 * of "looks fine, oh wait it's down" after hydration.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';

interface MaintenanceStatus {
  active: boolean;
  reason: string | null;
  sinceMs: number | null;
  by: string | null;
}

export async function MaintenanceBanner() {
  const status = await fetchJson<MaintenanceStatus>('/admin/api/maintenance');
  if (!status?.active) return null;

  const sinceTxt = status.sinceMs
    ? new Date(status.sinceMs).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
    : 'unknown';

  return (
    <div
      role="alert"
      style={{
        padding: '0.65rem 1rem',
        background: 'color-mix(in srgb, var(--warning) 18%, var(--bg))',
        borderBottom: '1px solid var(--warning)',
        color: 'var(--warning)',
        fontFamily: 'var(--font-heading)',
        fontSize: '0.75rem',
        letterSpacing: '0.06em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <span aria-hidden="true">⚠</span>
        <strong style={{ letterSpacing: '0.12em' }}>MAINTENANCE MODE ACTIVE</strong>
        <span style={{ fontWeight: 400, color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 0 }}>
          — Public API returns 503 to clients.
        </span>
      </span>
      <span style={{ fontWeight: 400, color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>
        {status.reason && <span>{status.reason} · </span>}
        Since {sinceTxt}
        {status.by && <span> · by {status.by}</span>}
      </span>
    </div>
  );
}
