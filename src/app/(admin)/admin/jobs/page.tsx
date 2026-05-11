/**
 * Jobs view — every @Scheduled job tracked by ScheduledJobsService:
 * Airlabs poller, position cleanup, audit retention, etc. Each job
 * row has a "Run now" button that POSTs to /admin/jobs/{id}/run.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { ClientTime } from '@/app/(admin)/ClientTime';
import { JobRunButton } from '@/app/(admin)/admin/jobs/JobRunButton';
import { JobOverrideControls } from '@/app/(admin)/admin/jobs/JobOverrideControls';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { ExportButton } from '@/app/(admin)/admin/shared/components/ExportButton';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

const JOBS_RUNBOOK = `
# Scheduled jobs
Every \`@Scheduled\` task in the api JVM. **ShedLock** ensures the same job doesn't fire on multiple replicas — only one wins the lock per tick.

# Status meanings
- **OK** — last run completed without exception
- **RUNNING** — currently executing (the Run-now button is hidden while busy)
- **ERROR** — last run threw; see *Last error* row
- **IDLE** — registered but never ran yet (just-started replica)

# Run-now
Triggers the job's manual-trigger callback. Not all jobs expose one — those without a trigger return 404. The button only renders when \`status !== RUNNING\` to avoid stomping on an in-flight execution.

# Adding a new job
Annotate the method with \`@Scheduled\` AND register a description via \`ScheduledJobsService.register(id, desc, intervalMs)\` in the bean's constructor or \`@PostConstruct\`. Without registration, the job runs but doesn't appear here.
`;

interface JobRow {
  description: string;
  intervalMs: number;
  lastStart: number | null;
  lastFinish: number | null;
  lastDurationMs: number;
  runCount: number;
  errorCount: number;
  status: 'IDLE' | 'RUNNING' | 'OK' | 'ERROR' | string;
  lastError: string | null;
  // Phase 2.7 — runtime overrides
  paused?: boolean;
  minIntervalMin?: number;
  overrideBy?: string;
  overrideAt?: string;
}

const STATUS_COLOR: Record<string, string> = {
  IDLE:    'var(--text-muted)',
  RUNNING: 'var(--info)',
  OK:      'var(--success)',
  ERROR:   'var(--error)',
};

export default async function AdminJobsPage() {
  const [jobsRaw, csrfToken, locale] = await Promise.all([
    fetchJson<Record<string, JobRow>>('/admin/api/jobs'),
    fetchCsrfToken(),
    getLocale(),
  ]);
  const t = (key: string) => translate(locale, key);

  const jobs = jobsRaw ?? {};
  const ids = Object.keys(jobs);

  const totalRuns   = ids.reduce((a, id) => a + jobs[id].runCount, 0);
  const totalErrors = ids.reduce((a, id) => a + jobs[id].errorCount, 0);
  const failingIds  = ids.filter((id) => jobs[id].status === 'ERROR');
  const runningIds  = ids.filter((id) => jobs[id].status === 'RUNNING');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>{t('page.jobs.title')}</h1>
        <p style={subtitleStyle}>{t('page.jobs.subtitle')}</p>
      </header>

      <HelpPanel pageId="jobs" markdown={JOBS_RUNBOOK} />

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.jobs.kpi.jobs')} value={ids.length} hint={t('page.jobs.kpi.jobs_hint')} />
        <KpiCard label={t('page.jobs.kpi.running')} value={runningIds.length} tone="info" />
        <KpiCard label={t('page.jobs.kpi.failing')} value={failingIds.length} tone={failingIds.length > 0 ? 'error' : 'success'} hint={failingIds.length > 0 ? t('page.jobs.kpi.failing_hint_bad') : t('page.jobs.kpi.failing_hint_ok')} />
        <KpiCard label={t('page.jobs.kpi.lifetime')} value={totalRuns} hint={`${totalErrors} ${t('page.jobs.col.errors').toLowerCase()}`} />
      </div>

      <section className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>All jobs</h2>
          {ids.length > 0 && (
            <ExportButton href="/admin/api/export/jobs.csv" filename="jobs.csv" compact />
          )}
        </div>
        {ids.length === 0 ? (
          <EmptyState
            icon="∅"
            title="No scheduled jobs"
            hint="ScheduledJobsService is empty. Either no @Scheduled beans are registered, or the job-pre-registration in AdminConfig hasn't run yet."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ids.map((id) => {
              const j = jobs[id];
              const color = STATUS_COLOR[j.status] ?? 'var(--text-muted)';
              return (
                <div key={id} style={{ ...jobCardStyle, borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <code style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)', fontSize: '0.875rem' }}>{id}</code>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>{j.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={statusPillStyle(color)}>{j.status}</span>
                      {csrfToken && j.status !== 'RUNNING' && (
                        <JobRunButton jobId={id} csrfToken={csrfToken} />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                    <Stat label="Interval"     value={formatInterval(j.intervalMs)} />
                    <Stat label="Last start"   value={j.lastStart ? <ClientTime iso={j.lastStart} mode="relative" /> : '—'} />
                    <Stat label="Last finish"  value={j.lastFinish ? <ClientTime iso={j.lastFinish} mode="relative" /> : '—'} />
                    <Stat label="Last took"    value={j.lastDurationMs > 0 ? `${j.lastDurationMs} ms` : '—'} />
                    <Stat label="Runs"         value={j.runCount.toLocaleString()} />
                    <Stat label="Errors"       value={<span style={{ color: j.errorCount > 0 ? 'var(--error)' : 'inherit' }}>{j.errorCount}</span>} />
                  </div>
                  {j.lastError && (
                    <pre style={errorBoxStyle}>{j.lastError}</pre>
                  )}
                  {csrfToken && (
                    <JobOverrideControls
                      jobId={id}
                      csrfToken={csrfToken}
                      currentPaused={!!j.paused}
                      currentMinIntervalMin={j.minIntervalMin ?? 0}
                      overrideBy={j.overrideBy}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function formatInterval(ms: number): string {
  if (ms <= 0) return 'cron';
  const s = Math.round(ms / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

function statusPillStyle(color: string) {
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
  };
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' };
const jobCardStyle = { padding: '0.875rem 1rem', background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 6 };
const errorBoxStyle = {
  marginTop: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: 'color-mix(in srgb, var(--error) 6%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 22%, transparent)',
  borderRadius: 4,
  color: 'var(--error)',
  fontSize: '0.6875rem',
  whiteSpace: 'pre-wrap' as const,
  overflow: 'auto',
  maxHeight: 160,
};
