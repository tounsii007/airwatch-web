/**
 * Endpoints view — per-endpoint request volume, error rate, p95 latency.
 * Sortable by total count (default — busiest first); operators look here
 * when "what's getting hammered right now" is the question.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { relativeTime } from '@/app/(admin)/admin/dashboard/utils';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { ExportButton } from '@/app/(admin)/admin/shared/components/ExportButton';

interface EndpointRow {
  method: string;
  path: string;
  count: number;
  errors: number;
  errorRate: number;     // %
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  inFlight: number;
  lastCalled: number;    // epoch ms (0 if never)
}

const METHOD_COLOR: Record<string, string> = {
  GET:    'var(--success)',
  POST:   'var(--info)',
  PUT:    'var(--warning)',
  PATCH:  'var(--warning)',
  DELETE: 'var(--error)',
};

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>All endpoints</h2>
          {rows.length > 0 && (
            <ExportButton href="/admin/api/export/endpoints.csv" filename="endpoints.csv" compact />
          )}
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon="⏳"
            title="No requests yet"
            hint="Replicas just started, or the endpoint metrics service hasn't seen its first hit. Page will populate within seconds of the first inbound request."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <Th>Method</Th>
                  <Th>Path</Th>
                  <Th align="right">Calls</Th>
                  <Th align="right">Errors</Th>
                  <Th align="right">Err%</Th>
                  <Th align="right">Avg</Th>
                  <Th align="right">p95</Th>
                  <Th align="right">Max</Th>
                  <Th align="right">In-flight</Th>
                  <Th align="right">Last call</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.method} ${r.path}`} style={{ borderTop: '1px solid var(--border)' }}>
                    <Td>
                      <span style={methodPillStyle(r.method)}>{r.method}</span>
                    </Td>
                    <Td>
                      <code style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>{r.path}</code>
                    </Td>
                    <Td align="right">{r.count.toLocaleString()}</Td>
                    <Td align="right">
                      <span style={{ color: r.errors > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                        {r.errors}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{ color: r.errorRate >= 5 ? 'var(--error)' : r.errorRate >= 1 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {r.errorRate.toFixed(2)}%
                      </span>
                    </Td>
                    <Td align="right">{r.avgMs.toFixed(1)} ms</Td>
                    <Td align="right">
                      <span style={{ color: r.p95Ms >= 2000 ? 'var(--error)' : r.p95Ms >= 500 ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {r.p95Ms} ms
                      </span>
                    </Td>
                    <Td align="right">{r.maxMs} ms</Td>
                    <Td align="right">{r.inFlight}</Td>
                    <Td align="right">
                      <span style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>
                        {r.lastCalled > 0 ? relativeTime(new Date(r.lastCalled).toISOString()) : '—'}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' as const };

function methodPillStyle(method: string) {
  const color = METHOD_COLOR[method] ?? 'var(--text-muted)';
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
    padding: '2px 6px',
    borderRadius: 3,
    whiteSpace: 'nowrap' as const,
  };
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{ textAlign: align, fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, padding: '0.5rem 0.75rem' }}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '0.5rem 0.75rem', textAlign: align }}>{children}</td>;
}
