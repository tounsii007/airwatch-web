/**
 * Admin dashboard — Phase 1 modern surface.
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │  KPI strip · uptime % · ports up · threats blocked · attempts today     │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │  Donut: ports up/down              │  World map: blocked-IP origins     │
 *   │  Port grid + sparklines (history)  │  HBar: top 10 offenders            │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │  LIVE rejection feed (5 s polling, animated rows)                       │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * Server-rendered initial state from /admin/api/monitoring/* endpoints.
 * The LiveFeed component takes over for the rejection feed and polls
 * every 5 seconds.
 */

import { Donut }       from '@/app/admin/charts/Donut';
import { Sparkline }   from '@/app/admin/charts/Sparkline';
import { HBar }        from '@/app/admin/charts/HBar';
import { WorldMap }    from '@/app/admin/charts/WorldMap';
import { KpiCard }     from '@/app/admin/components/KpiCard';
import { LiveFeed }    from '@/app/admin/components/LiveFeed';
import { LoadCurves }         from '@/app/admin/components/LoadCurves';
import { UserCurves }         from '@/app/admin/components/UserCurves';
import { CountryChart }       from '@/app/admin/components/CountryChart';
import { ViewPopularityChart } from '@/app/admin/components/ViewPopularityChart';
import { MapStyleChart }      from '@/app/admin/components/MapStyleChart';

interface PortRow {
  port_name: string;
  host: string;
  port_number: number;
  up: boolean;
  latency_ms: number | null;
  error_msg: string | null;
  probed_at: string;
}

interface BlockedIp {
  ip: string;
  country_code: string | null;
  attempt_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_path: string | null;
  last_user_agent: string | null;
}

interface RejectEvent {
  id: number;
  occurred_at: string;
  ip: string;
  country_code: string | null;
  method: string;
  path: string;
  reason: string;
  user_agent: string | null;
}

interface PortHistoryPoint {
  probed_at: string;
  up: boolean;
  latency_ms: number | null;
  error_msg: string | null;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const base = process.env.INTERNAL_API_URL || 'http://nginx:18080';
  try {
    const res = await fetch(`${base}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function relativeTime(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3_600_000)}h`;
  } catch { return iso; }
}

export default async function AdminDashboardPage() {
  const [ports, blocked, recent] = await Promise.all([
    fetchJson<PortRow[]>('/admin/api/monitoring/ports'),
    fetchJson<BlockedIp[]>('/admin/api/monitoring/unauthorized-ips?limit=10'),
    fetchJson<RejectEvent[]>('/admin/api/monitoring/unauthorized-events?limit=30'),
  ]);

  // Per-port latency history is fetched lazily for each up port — a bit
  // chatty but the response is tiny (60 rows max). Could be batched into
  // one endpoint in Phase 3 if it shows up in the slow-render budget.
  const portsWithHistory: Array<PortRow & { history: number[] }> = [];
  if (ports) {
    const histories = await Promise.all(
      ports.map(async (p) => {
        const hist = await fetchJson<PortHistoryPoint[]>(
          `/admin/api/monitoring/ports/${encodeURIComponent(p.port_name)}/history?minutes=60`,
        );
        return { ...p, history: (hist ?? []).map((h) => h.latency_ms ?? 0) };
      }),
    );
    portsWithHistory.push(...histories);
  }

  // ── KPI math ────────────────────────────────────────────────────────────
  const portsUp     = ports?.filter((p) => p.up).length ?? 0;
  const portsTotal  = ports?.length ?? 0;
  const uptimePct   = portsTotal > 0 ? Math.round((portsUp / portsTotal) * 1000) / 10 : 0;
  const totalBlocked = blocked?.reduce((a, b) => a + b.attempt_count, 0) ?? 0;
  const uniqueIps   = blocked?.length ?? 0;
  const recentRate  = recent?.length ?? 0;

  // ── Country aggregate (Phase 1: from blocked.country_code; Phase 2 will
  //    have geo-IP enrichment populating that column). Empty in Phase 1
  //    until enrichment lands → WorldMap renders the placeholder state. ──
  const countryCounts: Record<string, number> = {};
  for (const b of blocked ?? []) {
    if (b.country_code) {
      countryCounts[b.country_code] = (countryCounts[b.country_code] ?? 0) + b.attempt_count;
    }
  }

  // Top offender list for the HBar.
  const topOffenders = (blocked ?? []).slice(0, 8).map((b) => ({
    label: b.ip,
    value: b.attempt_count,
    color: 'var(--error)',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' }}>
            Operations Overview
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 }}>
            Live monitoring · {portsTotal} ports · last refreshed just now
          </p>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.6875rem',
            letterSpacing: '0.15em',
            color: uptimePct === 100 ? 'var(--success)' : uptimePct >= 80 ? 'var(--warning)' : 'var(--error)',
            background: 'color-mix(in srgb, currentColor 10%, transparent)',
            border: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          ● {uptimePct === 100 ? 'ALL SYSTEMS NOMINAL' : uptimePct >= 80 ? 'DEGRADED' : 'CRITICAL'}
        </span>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <KpiCard
          label="UPTIME"
          value={uptimePct}
          unit="%"
          decimals={1}
          tone={uptimePct === 100 ? 'success' : uptimePct >= 80 ? 'warning' : 'error'}
          hint={`${portsUp}/${portsTotal} ports up`}
        />
        <KpiCard
          label="THREATS BLOCKED"
          value={totalBlocked}
          tone="error"
          hint={`${uniqueIps} unique IPs`}
        />
        <KpiCard
          label="RECENT REJECTIONS"
          value={recentRate}
          tone="warning"
          hint="last 30 events"
        />
        <KpiCard
          label="AVG LATENCY"
          value={Math.round((portsWithHistory.filter((p) => p.up).map((p) => p.latency_ms ?? 0).reduce((a, b) => a + b, 0) / Math.max(1, portsUp)) || 0)}
          unit="ms"
          tone="info"
          hint="across all up ports"
        />
      </div>

      {/* ── Status donut + world map row ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }} className="admin-grid-2col">
        <section className="admin-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Port status</h2>
          <Donut
            value={portsUp}
            total={portsTotal || 1}
            color={uptimePct === 100 ? 'var(--success)' : uptimePct >= 80 ? 'var(--warning)' : 'var(--error)'}
          >
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {portsUp}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{portsTotal}</span>
            </div>
            <div style={{ fontSize: '0.625rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>
              UP
            </div>
          </Donut>
        </section>
        <section className="admin-card">
          <h2>Threat origins (Phase-1 placeholder)</h2>
          <WorldMap data={countryCounts} height={280} />
        </section>
      </div>

      {/* ── Port grid with per-port sparklines ────────────────────────── */}
      <section className="admin-card">
        <h2>Port latency · last 60 minutes</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {(portsWithHistory.length > 0 ? portsWithHistory : []).map((p) => (
            <div
              key={p.port_name}
              style={{
                background: 'rgba(15, 29, 50, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '0.6rem 0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--primary-bright)' }}>
                  {p.port_name}
                </span>
                <span className={`pill ${p.up ? 'pill-up' : 'pill-down'}`} style={{ fontSize: '0.5625rem', padding: '0 6px' }}>
                  {p.up ? 'UP' : 'DOWN'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                <span>{p.host}:{p.port_number}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                  {p.latency_ms != null ? `${p.latency_ms} ms` : '—'} · {relativeTime(p.probed_at)}
                </span>
              </div>
              <div style={{ marginTop: 6, height: 30, color: p.up ? 'var(--success)' : 'var(--error)' }}>
                <Sparkline values={p.history} stroke={p.up ? 'var(--success)' : 'var(--error)'} fill={p.up ? 'var(--success)' : 'var(--error)'} height={30} />
              </div>
            </div>
          ))}
          {portsWithHistory.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '1rem' }}>
              No probes yet — first round runs 30 s after startup.
            </div>
          )}
        </div>
      </section>

      {/* ── Load curves (CPU / heap / threads / req-rate / replicas) ─── */}
      <LoadCurves defaultService="api" />

      {/* ── Concurrent users per app ──────────────────────────────────── */}
      <UserCurves />

      {/* ── Top offenders + Live feed row ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="admin-grid-2col">
        <section className="admin-card">
          <h2>Top offenders by attempt count</h2>
          {topOffenders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No blocked IPs recorded yet.</p>
          ) : (
            <HBar items={topOffenders} />
          )}
        </section>
        <section className="admin-card">
          <h2>Live rejection feed</h2>
          <LiveFeed initial={recent ?? []} />
        </section>
      </div>

      {/* ── Country + view popularity row (Phase 2) ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="admin-grid-2col">
        <CountryChart />
        <ViewPopularityChart />
      </div>

      {/* ── Map-style usage (Phase 2) ─────────────────────────────────── */}
      <MapStyleChart />

      {/* ── Phase-3 teaser ────────────────────────────────────────────── */}
      <section className="admin-card" style={{ borderStyle: 'dashed', opacity: 0.7 }}>
        <h2>Coming in Phase 3</h2>
        <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <li>· Email alerts on instance failure with detail counts</li>
          <li>· Critical-error rolling-window sweep + dashboard panel</li>
          <li>· Docker stats integration for web/mobile load curves</li>
          <li>· Watchdog for nginx / postgres / web outage emails</li>
          <li>· Per-IP unauthorised-attempt email on threshold breach</li>
          <li>· Multi-day country / view trend curves</li>
        </ul>
      </section>
    </div>
  );
}
