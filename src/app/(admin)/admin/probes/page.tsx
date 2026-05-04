/**
 * Synthetic probes view (Phase 2.3) — operator-defined HTTP checks.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { ProbesClient } from '@/app/(admin)/admin/probes/ProbesClient';

interface Probe {
  id: number;
  name: string;
  method: string;
  url: string;
  expectStatus: number;
  expectBody: string | null;
  intervalMin: number;
  timeoutSec: number;
  failThreshold: number;
  enabled: boolean;
  consecFailures: number;
}

const RUNBOOK = `
# Synthetic probes
HTTP checks the api container fires from its own perspective. Useful for:

- Confirming external dependencies (Airlabs, ip-api.com, your nginx ingress) stay reachable
- Detecting subtle regressions ("/health used to return 200, now it's 503")
- Catching DNS / TLS / firewall changes before customer reports

# Threshold semantics
A probe fires an alert (kind = \`synthetic_probe\`) once it accumulates **failThreshold** consecutive failures. The alert flows through the standard ack/snooze/mute pipeline — no separate alert UI to learn.

# Tips
- Set \`expectBody\` to a substring you know the healthy response contains — catches "200 OK with empty body" regressions
- Keep timeouts ≤ 10s so a slow probe doesn't block the runner
- Probes are evaluated every minute, but each probe respects its own \`intervalMin\` — that's the floor on how often it actually fires
`;

export default async function ProbesPage() {
  const [data, csrfToken] = await Promise.all([
    fetchJson<{ probes: Probe[] }>('/admin/api/probes'),
    fetchCsrfToken(),
  ]);

  const probes  = data?.probes ?? [];
  const failing = probes.filter(p => p.consecFailures > 0).length;
  const enabled = probes.filter(p => p.enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>Synthetic probes</h1>
        <p style={subtitleStyle}>Operator-defined HTTP checks. Threshold breaches fire through the standard alert pipeline.</p>
      </header>

      <HelpPanel pageId="probes" markdown={RUNBOOK} />

      <div style={kpiGridStyle}>
        <KpiCard label="REGISTERED" value={probes.length} hint="all probes" />
        <KpiCard label="ENABLED"    value={enabled}       tone="info"    hint="actively polled" />
        <KpiCard label="FAILING"    value={failing}       tone={failing > 0 ? 'error' : 'success'} hint={failing > 0 ? 'investigate' : 'all green'} />
      </div>

      <ProbesClient initialProbes={probes} csrfToken={csrfToken} />
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
