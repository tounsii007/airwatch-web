/**
 * Health view — the suite of probes HealthCheckService runs (DB, Airlabs
 * poller freshness, WS server, JVM heap, error rate). Each probe reports
 * OK / WARN / ERROR with a human-readable detail string.
 *
 * The "overall" status is the worst of the individual probes — operators
 * land here from an alert and the top badge tells them how bad it is.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { relativeTime } from '@/app/(admin)/admin/dashboard/utils';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

interface Check {
  name: string;
  status: 'OK' | 'WARN' | 'ERROR';
  detail: string;
}

interface HealthPayload {
  overall: 'OK' | 'WARN' | 'ERROR';
  ts: number;
  checks: Check[];
}

const STATUS_COLOR: Record<Check['status'], string> = {
  OK:    'var(--success)',
  WARN:  'var(--warning)',
  ERROR: 'var(--error)',
};

export default async function AdminHealthPage() {
  const h = await fetchJson<HealthPayload>('/admin/api/health');
  const locale = await getLocale();
  const t = (key: string) => translate(locale, key);

  const overall = h?.overall ?? 'ERROR';
  const checks  = h?.checks ?? [];
  const ts      = h?.ts ?? 0;

  const okCount    = checks.filter((c) => c.status === 'OK').length;
  const warnCount  = checks.filter((c) => c.status === 'WARN').length;
  const errorCount = checks.filter((c) => c.status === 'ERROR').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={headingStyle}>{t('page.health.title')}</h1>
          <p style={subtitleStyle}>{t('page.health.subtitle')}</p>
        </div>
        <span style={overallPillStyle(overall)}>● {overall}</span>
      </header>

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.health.kpi.healthy')}  value={okCount}    tone="success" hint={t('page.health.kpi.healthy_hint')} />
        <KpiCard label={t('page.health.kpi.warning')}  value={warnCount}  tone={warnCount > 0 ? 'warning' : 'success'} hint={t('page.health.kpi.warning_hint')} />
        <KpiCard label={t('page.health.kpi.failing')}  value={errorCount} tone={errorCount > 0 ? 'error' : 'success'}   hint={t('page.health.kpi.failing_hint')} />
      </div>

      <section className="admin-card">
        <h2>
          {t('page.health.section.probes')}
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }} suppressHydrationWarning>
            {t('page.health.sampled')} {ts > 0 ? relativeTime(new Date(ts).toISOString()) : '—'}
          </span>
        </h2>
        {checks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{t('page.health.empty')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {checks.map((c) => (
              <div key={c.name} style={probeRowStyle(c.status)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={statusPillStyle(c.status)}>{c.status}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-bright)', fontSize: '0.875rem' }}>
                    {c.name}
                  </span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{c.detail}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function overallPillStyle(s: Check['status']) {
  const color = STATUS_COLOR[s];
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.6875rem',
    letterSpacing: '0.15em',
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
    padding: '4px 12px',
    borderRadius: 999,
    whiteSpace: 'nowrap' as const,
  };
}

function statusPillStyle(s: Check['status']) {
  const color = STATUS_COLOR[s];
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
    padding: '2px 8px',
    borderRadius: 3,
    minWidth: 50,
    textAlign: 'center' as const,
  };
}

function probeRowStyle(s: Check['status']) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'var(--sunken)',
    border: `1px solid color-mix(in srgb, ${STATUS_COLOR[s]} 18%, var(--border))`,
    borderRadius: 6,
    borderLeft: `3px solid ${STATUS_COLOR[s]}`,
  };
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
