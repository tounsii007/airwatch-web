/**
 * Ports view — full-detail counterpart to the dashboard's PortGrid.
 *
 * The dashboard shows a compact tile per port; this page goes deeper:
 * a sortable table with last error message, full sparkline, and KPI
 * counters at the top. Ops uses it as the "what's broken right now"
 * landing page when the dashboard's CRITICAL pill turns red.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import type { PortRow, PortHistoryPoint, PortRowWithHistory } from '@/app/(admin)/admin/dashboard/types';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { PortGrid } from '@/app/(admin)/admin/dashboard/sections/PortGrid';
import { PortsTable } from '@/app/(admin)/admin/ports/PortsTable';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

const PORTS_RUNBOOK = `
# What's probed
TCP-connect against every entry in \`airwatch.admin.monitoring.port-targets\` (default catalog covers nginx + api + postgres + web). One row per probe, every 30 s, ShedLock-guarded so only one replica writes.

# UP / DOWN
- **UP** — TCP handshake completed within 2 s
- **DOWN** — connect refused, connect timeout, or DNS failure

The latency column is the full handshake time; healthy targets answer in <50 ms over the docker bridge.

# Triage
- One port DOWN → check the upstream container's logs. Often a slow startup.
- All "nginx_*" DOWN → the nginx container is down (or its config crashed). \`docker compose logs nginx\`.
- "postgres" DOWN → DB outage. The api will be in fallback mode; expect 503s on /admin too.

# Pause via Job overrides (Phase 2.7)
The probe job can be paused/throttled from /admin/jobs (job id \`port-monitor\`). Useful during planned port maintenance to silence the noise.
`;

export default async function AdminPortsPage() {
  // Reuse the dashboard fetch path — same endpoint, same shape. Fetching
  // here (instead of importing fetchDashboardData) avoids pulling in the
  // unrelated unauthorized-* + audit calls that this page doesn't show.
  const [ports, locale] = await Promise.all([
    fetchJson<PortRow[]>('/admin/api/monitoring/ports'),
    getLocale(),
  ]);
  const t = (key: string) => translate(locale, key);

  let portsWithHistory: PortRowWithHistory[] = [];
  if (ports) {
    portsWithHistory = await Promise.all(
      ports.map(async (p) => {
        const hist = await fetchJson<PortHistoryPoint[]>(
          `/admin/api/monitoring/ports/${encodeURIComponent(p.port_name)}/history?minutes=60`,
        );
        const points = (hist ?? []).map((h) => ({
          t: new Date(h.probed_at).getTime(),
          v: h.latency_ms ?? 0,
          up: h.up,
        }));
        return {
          ...p,
          history: points.map((pt) => pt.v),
          historyPoints: points,
        };
      }),
    );
  }

  const portsTotal = portsWithHistory.length;
  const portsUp    = portsWithHistory.filter((p) => p.up).length;
  const portsDown  = portsTotal - portsUp;
  const uptimePct  = portsTotal > 0 ? Math.round((portsUp / portsTotal) * 1000) / 10 : 0;
  const upPorts    = portsWithHistory.filter((p) => p.up && p.latency_ms != null);
  const avgLatency = upPorts.length > 0
    ? Math.round(upPorts.reduce((a, p) => a + (p.latency_ms ?? 0), 0) / upPorts.length)
    : 0;
  const slowest = upPorts.reduce<PortRowWithHistory | null>(
    (max, p) => (max == null || (p.latency_ms ?? 0) > (max.latency_ms ?? 0) ? p : max),
    null,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <HelpPanel pageId="ports" markdown={PORTS_RUNBOOK} />
      <header>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: 'var(--primary-bright)',
          }}
        >
          {t('page.ports.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 }}>
          {t('page.ports.subtitle')}
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <KpiCard
          label={t('page.ports.kpi.uptime')}
          value={uptimePct}
          decimals={1}
          unit="%"
          tone={uptimePct === 100 ? 'success' : uptimePct >= 80 ? 'warning' : 'error'}
          hint={`${portsUp}/${portsTotal} ${t('page.ports.kpi.uptime_hint')}`}
        />
        <KpiCard
          label={t('page.ports.kpi.down')}
          value={portsDown}
          tone={portsDown === 0 ? 'success' : 'error'}
          hint={portsDown === 0 ? t('page.ports.kpi.down_hint_ok') : t('page.ports.kpi.down_hint_some')}
        />
        <KpiCard
          label={t('page.ports.kpi.avg_latency')}
          value={avgLatency}
          unit="ms"
          tone={avgLatency < 50 ? 'success' : avgLatency < 200 ? 'warning' : 'error'}
          hint={t('page.ports.kpi.avg_latency_hint')}
        />
        <KpiCard
          label={t('page.ports.kpi.slowest')}
          value={slowest?.latency_ms ?? 0}
          unit="ms"
          tone={(slowest?.latency_ms ?? 0) < 200 ? 'success' : 'warning'}
          hint={slowest?.port_name ?? '—'}
        />
      </div>

      <PortGrid ports={portsWithHistory} />

      <PortsTable ports={portsWithHistory} />
    </div>
  );
}
