/**
 * Endpoints view — per-endpoint request volume, error rate, p95 latency.
 * Sortable by total count (default — busiest first); operators look here
 * when "what's getting hammered right now" is the question.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { EndpointsTable, type EndpointRow } from '@/app/(admin)/admin/endpoints/EndpointsTable';

export default async function AdminEndpointsPage() {
  const rows = (await fetchJson<EndpointRow[]>('/admin/api/endpoints')) ?? [];

  const totalCalls   = rows.reduce((a, r) => a + r.count, 0);
  const totalErrors  = rows.reduce((a, r) => a + r.errors, 0);
  const errorPct     = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;
  const inFlightSum  = rows.reduce((a, r) => a + r.inFlight, 0);
  const slowest = rows.reduce<EndpointRow | null>(
    (max, r) => (max == null || r.p95Ms > max.p95Ms ? r : max),
    null,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>Endpoints</h1>
        <p style={subtitleStyle}>Per-route metrics across both api replicas. Sorted by call volume.</p>
      </header>

      <div style={kpiGridStyle}>
        <KpiCard label="ENDPOINTS" value={rows.length} hint="distinct routes seen" />
        <KpiCard label="TOTAL CALLS" value={totalCalls} hint="since last restart" />
        <KpiCard
          label="ERROR RATE"
          value={errorPct}
          decimals={2}
          unit="%"
          tone={errorPct < 1 ? 'success' : errorPct < 5 ? 'warning' : 'error'}
          hint={`${totalErrors} errors`}
        />
        <KpiCard
          label="SLOWEST p95"
          value={slowest?.p95Ms ?? 0}
          unit="ms"
          tone={(slowest?.p95Ms ?? 0) < 500 ? 'success' : (slowest?.p95Ms ?? 0) < 2000 ? 'warning' : 'error'}
          hint={slowest ? `${slowest.method} ${slowest.path}` : '—'}
        />
        <KpiCard label="IN-FLIGHT NOW" value={inFlightSum} tone="info" hint="active requests" />
      </div>

      <section className="admin-card">
        <h2 style={{ margin: '0 0 0.75rem 0' }}>All endpoints</h2>
        {rows.length === 0 ? (
          <EmptyState
            icon="⏳"
            title="No requests yet"
            hint="Replicas just started, or the endpoint metrics service hasn't seen its first hit. Page will populate within seconds of the first inbound request."
          />
        ) : (
          <EndpointsTable rows={rows} />
        )}
      </section>
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' };
