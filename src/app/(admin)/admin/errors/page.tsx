/**
 * Errors view — last 200 errors from ErrorLogBuffer + a "Clear" button.
 *
 * The form posts straight to the Spring Boot /admin/errors/clear endpoint.
 * AdminAuthFilter validates the session cookie + CSRF token; on success
 * Spring Boot sendRedirects back to /admin/errors which re-renders this
 * page with an empty buffer.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { relativeTime } from '@/app/(admin)/admin/dashboard/utils';
import { ActionResultToast } from '@/app/(admin)/ActionResultToast';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { ExportButton } from '@/app/(admin)/admin/shared/components/ExportButton';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { FrontendErrorsCard } from '@/app/(admin)/admin/errors/FrontendErrorsCard';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

const ERRORS_RUNBOOK = `
# In-memory error buffer
Live tail of every WARN/ERROR log line from the api JVM, capped at 500 entries. Survives across replicas via the SLF4J appender → buffer; does **not** survive a restart.

# Triage flow
1. Group by **signature** column — same exception thrown 200 times = one bug, not 200.
2. Click into the trace to see the full stack.
3. Cross-reference \`/admin/audit\` for any operator action that triggered the spike.

# When to clear
After resolving the underlying issue. Clearing is safe — the buffer auto-refills from new log lines.

# This buffer vs Loki
Loki has the full retention window (30 d), filterable by container/severity/regex. Use this buffer for "what just broke?" and Loki for "what broke last week?".
`;

interface ErrorEntry {
  id: number;
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  signature: string;
  throwable: string | null;
}

interface ErrorsPayload {
  total: number;
  buffered: number;
  entries: ErrorEntry[];
}

const LEVEL_COLOR: Record<string, string> = {
  ERROR: 'var(--error)',
  WARN:  'var(--warning)',
  INFO:  'var(--info)',
};

export default async function AdminErrorsPage() {
  const [data, csrfToken, locale] = await Promise.all([
    fetchJson<ErrorsPayload>('/admin/api/errors'),
    fetchCsrfToken(),
    getLocale(),
  ]);
  const t = (key: string) => translate(locale, key);

  const total    = data?.total ?? 0;
  const buffered = data?.buffered ?? 0;
  const entries  = data?.entries ?? [];

  // Group by signature so the dashboard at-a-glance shows duplicate spam.
  const bySignature = new Map<string, number>();
  for (const e of entries) {
    bySignature.set(e.signature, (bySignature.get(e.signature) ?? 0) + 1);
  }
  const uniqueSigs = bySignature.size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ActionResultToast
        successMessages={{ cleared: 'Error buffer cleared.' }}
      />
      <HelpPanel pageId="errors" markdown={ERRORS_RUNBOOK} />
      <header style={headerRowStyle}>
        <div>
          <h1 style={headingStyle}>{t('page.errors.title')}</h1>
          <p style={subtitleStyle}>{t('page.errors.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {entries.length > 0 && (
            <ExportButton href="/admin/api/export/errors.csv" filename="errors.csv" />
          )}
          {csrfToken && entries.length > 0 && (
            <form method="post" action="/admin/errors/clear">
              <input type="hidden" name="_csrf" value={csrfToken} />
              <button type="submit" style={dangerButtonStyle}>{t('page.errors.action.clear')}</button>
            </form>
          )}
        </div>
      </header>

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.errors.kpi.total')} value={total} hint={t('page.errors.kpi.total_hint')} />
        <KpiCard label={t('page.errors.kpi.buffered')} value={buffered} tone={buffered > 100 ? 'warning' : 'default'} hint={t('page.errors.kpi.buffered_hint')} />
        <KpiCard label={t('page.errors.kpi.unique')} value={uniqueSigs} tone={uniqueSigs > 5 ? 'warning' : 'default'} hint={t('page.errors.kpi.unique_hint')} />
      </div>

      <section className="admin-card">
        <h2>{t('page.errors.section.backend')}</h2>
        {entries.length === 0 ? (
          <EmptyState
            icon="✓"
            tone="calm"
            title={t('page.errors.empty')}
            hint={t('page.errors.empty_hint')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {entries.map((e) => (
              <ErrorCard key={e.id} entry={e} count={bySignature.get(e.signature) ?? 1} />
            ))}
          </div>
        )}
      </section>

      {/* Phase 3.1 — frontend exceptions captured by FrontendErrorReporter
          mounted in the admin layout. Independent ring buffer in the api. */}
      <FrontendErrorsCard />
    </div>
  );
}

function ErrorCard({ entry, count }: { entry: ErrorEntry; count: number }) {
  const color = LEVEL_COLOR[entry.level] ?? 'var(--text-muted)';
  return (
    <div style={{ ...errorCardStyle, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
        <span style={levelPillStyle(color)}>{entry.level}</span>
        <code style={{ color: 'var(--primary-bright)', fontSize: '0.6875rem' }}>{entry.logger}</code>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.6875rem' }} suppressHydrationWarning>
          {relativeTime(entry.timestamp)} ago
        </span>
        {count > 1 && (
          <span style={{ color: 'var(--warning)', fontSize: '0.6875rem', fontWeight: 700 }}>
            ×{count}
          </span>
        )}
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', wordBreak: 'break-word' }}>
        {entry.message}
      </div>
      {entry.throwable && (
        <pre style={{
          marginTop: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          color: 'var(--text-muted)',
          fontSize: '0.6875rem',
          overflow: 'auto',
          maxHeight: 200,
          whiteSpace: 'pre-wrap',
        }}>
          {entry.throwable}
        </pre>
      )}
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const headerRowStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0.75rem' };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
const errorCardStyle = { padding: '0.75rem 1rem', background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 6 };
const dangerButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--error)',
  background: 'color-mix(in srgb, var(--error) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 28%, transparent)',
  padding: '0.5rem 1rem',
  borderRadius: 4,
  cursor: 'pointer',
};

function levelPillStyle(color: string) {
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
