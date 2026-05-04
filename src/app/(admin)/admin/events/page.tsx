/**
 * Events view — cluster-wide event counters per replica, per category.
 *
 * Backend: each replica writes its EventMetrics totals to Redis every
 * 10 s via {@code EventCountersPublisher}. The endpoint
 * {@code /admin/api/monitoring/event-counters} scans those keys so a
 * single API call returns every replica's counters regardless of which
 * replica handled the request.
 *
 * Layout:
 *   * KPI strip — total events, top category, replicas reporting
 *   * Per-category cluster totals (HBar) with breakdown by replica
 *   * Per-replica matrix table — rows = instance, columns = category
 *   * Refresh integrates with the layout-level AutoRefresh control
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { HBar } from '@/app/(admin)/admin/shared/charts/HBar';

interface InstanceEntry {
  categories: Record<string, number>;
  lastFlushMs: number | null;
  startedAtMs: number | null;
  ageSec: number | null;
}

interface EventCountersPayload {
  instances: Record<string, InstanceEntry>;
  totals: Record<string, number>;
}

export default async function AdminEventsPage() {
  const data = await fetchJson<EventCountersPayload>('/admin/api/monitoring/event-counters');

  const instances = data?.instances ?? {};
  const totals    = data?.totals ?? {};

  const instanceIds   = Object.keys(instances).sort();
  const replicaCount  = instanceIds.length;
  const fresh         = instanceIds.filter((id) => (instances[id].ageSec ?? 999) < 30).length;
  const categories    = Object.keys(totals).sort();
  const grandTotal    = Object.values(totals).reduce((a, b) => a + b, 0);
  const topEntry      = Object.entries(totals).sort(([, a], [, b]) => b - a)[0];

  // HBar items — top categories cluster-wide.
  const items = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([code, count], i) => ({
      label: code,
      value: count,
      color: count === 0
        ? 'var(--text-muted)'
        : i === 0 ? 'var(--success)'
        : i < 3 ? 'var(--info)'
        : 'var(--primary)',
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>Events</h1>
        <p style={subtitleStyle}>
          Cluster-wide event counters by category and replica. Each replica
          flushes its EventMetrics totals to Redis every 10 s; this view
          aggregates every replica's data via a single Redis scan.
        </p>
      </header>

      <div style={kpiGridStyle}>
        <KpiCard
          label="REPLICAS REPORTING"
          value={fresh}
          tone={fresh === replicaCount && replicaCount > 0 ? 'success' : 'warning'}
          hint={`${replicaCount} known · ${fresh} fresh (<30 s)`}
        />
        <KpiCard
          label="CATEGORIES"
          value={categories.length}
          hint="distinct event types"
        />
        <KpiCard
          label="TOTAL EVENTS"
          value={grandTotal}
          tone="info"
          hint="sum across cluster, lifetime"
        />
        <KpiCard
          label="TOP CATEGORY"
          value={topEntry?.[1] ?? 0}
          tone="success"
          hint={topEntry?.[0] ?? '—'}
        />
      </div>

      <section className="admin-card">
        <h2>Cluster totals by category</h2>
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No events recorded yet. The publisher needs ~15 s after start to flush its first batch.
          </p>
        ) : (
          <HBar items={items} />
        )}
      </section>

      <section className="admin-card">
        <h2>Per-replica × per-category matrix</h2>
        {replicaCount === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No replicas have flushed counters to Redis yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <Th>Instance</Th>
                  <Th align="right">Last flush</Th>
                  {categories.map((c) => (
                    <Th key={c} align="right">
                      <code style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{c}</code>
                    </Th>
                  ))}
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {instanceIds.map((id) => {
                  const inst = instances[id];
                  const rowTotal = Object.values(inst.categories).reduce((a, b) => a + b, 0);
                  const ageSec = inst.ageSec ?? 999;
                  return (
                    <tr key={id} style={{ borderTop: '1px solid var(--border)' }}>
                      <Td>
                        <code style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem' }}>
                          {id}
                        </code>
                      </Td>
                      <Td align="right">
                        <span style={{
                          color: ageSec < 30 ? 'var(--success)' : ageSec < 120 ? 'var(--warning)' : 'var(--error)',
                          fontSize: '0.6875rem',
                        }}>
                          {ageSec < 60 ? `${ageSec}s ago` : `${Math.round(ageSec / 60)}m ago`}
                        </span>
                      </Td>
                      {categories.map((c) => (
                        <Td key={c} align="right">
                          <span style={{ color: (inst.categories[c] ?? 0) === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            {(inst.categories[c] ?? 0).toLocaleString()}
                          </span>
                        </Td>
                      ))}
                      <Td align="right">
                        <span style={{ color: 'var(--primary-bright)', fontWeight: 600 }}>
                          {rowTotal.toLocaleString()}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
                {/* Cluster-totals row at the bottom for quick mental sum-check. */}
                <tr style={{ borderTop: '2px solid var(--border-strong)', background: 'rgba(122,154,191,0.05)' }}>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.6875rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                      CLUSTER TOTAL
                    </span>
                  </Td>
                  <Td align="right">—</Td>
                  {categories.map((c) => (
                    <Td key={c} align="right">
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {(totals[c] ?? 0).toLocaleString()}
                      </span>
                    </Td>
                  ))}
                  <Td align="right">
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                      {grandTotal.toLocaleString()}
                    </span>
                  </Td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>Notes</h2>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
          <li>Counters are <strong>lifetime per replica</strong> — they reset to zero on each replica restart.</li>
          <li>The "Last flush" column shows when the replica last pushed its counters; values older than 30 s are highlighted (replica may be stale or down).</li>
          <li>Use the global <code>Auto-refresh</code> picker in the header to set a polling cadence — 10 s aligns with the publisher interval.</li>
          <li>For long-window analytics (per-day / per-week / per-month) the Prometheus + Grafana stack is the right tool; this view is optimised for "what's happening across replicas right now".</li>
        </ul>
      </section>
    </div>
  );
}

const headingStyle    = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle   = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4, maxWidth: 640 };
const kpiGridStyle    = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
const tableStyle      = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' as const };

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      textAlign: align,
      fontFamily: 'var(--font-heading)',
      fontSize: '0.625rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      fontWeight: 700,
      padding: '0.5rem 0.75rem',
      whiteSpace: 'nowrap' as const,
    }}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '0.5rem 0.75rem', textAlign: align, whiteSpace: 'nowrap' as const }}>{children}</td>;
}
