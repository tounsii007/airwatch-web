/**
 * Synthetic probes view (Phase 2.3) — operator-defined HTTP checks.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { ProbesClient } from '@/app/(admin)/admin/probes/ProbesClient';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

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
  const [data, csrfToken, locale] = await Promise.all([
    fetchJson<{ probes: Probe[] }>('/admin/api/probes'),
    fetchCsrfToken(),
    getLocale(),
  ]);
  const t = (key: string) => translate(locale, key);

  const probes  = data?.probes ?? [];
  const failing = probes.filter(p => p.consecFailures > 0).length;
  const enabled = probes.filter(p => p.enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>{t('page.probes.title')}</h1>
        <p style={subtitleStyle}>{t('page.probes.subtitle')}</p>
      </header>

      <HelpPanel pageId="probes" markdown={RUNBOOK} />

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.probes.kpi.registered')} value={probes.length} hint={t('page.probes.kpi.registered_hint')} />
        <KpiCard label={t('page.probes.kpi.enabled')}    value={enabled}       tone="info" hint={t('page.probes.kpi.enabled_hint')} />
        <KpiCard label={t('page.probes.kpi.failing')}    value={failing}       tone={failing > 0 ? 'error' : 'success'} hint={failing > 0 ? t('page.probes.kpi.failing_hint_bad') : t('page.probes.kpi.failing_hint_ok')} />
      </div>

      <ProbesClient initialProbes={probes} csrfToken={csrfToken} />
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
