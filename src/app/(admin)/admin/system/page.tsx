/**
 * System view — JVM resource snapshot per replica. Heap %, threads,
 * uptime, available cores. Operators check this when an api replica
 * goes unhealthy or the overall response time degrades.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';
import { BackupSection } from '@/app/(admin)/admin/system/BackupSection';

interface SystemPayload {
  availableProcessors: number;
  maxMemoryMb: number;
  totalMemoryMb: number;
  usedMemoryMb: number;
  heapUsagePercent: number;
  threadCount: number;
  uptimeMs: number;
}

export default async function AdminSystemPage() {
  const [s, locale, csrfToken] = await Promise.all([
    fetchJson<SystemPayload>('/admin/api/system'),
    getLocale(),
    fetchCsrfToken(),
  ]);
  const t = (key: string) => translate(locale, key);

  const heapPct      = s?.heapUsagePercent ?? 0;
  const usedMb       = s?.usedMemoryMb ?? 0;
  const totalMb      = s?.totalMemoryMb ?? 0;
  const maxMb        = s?.maxMemoryMb ?? 0;
  const threads      = s?.threadCount ?? 0;
  const cores        = s?.availableProcessors ?? 0;
  const uptimeMs     = s?.uptimeMs ?? 0;

  const heapTone = heapPct >= 90 ? 'error' : heapPct >= 75 ? 'warning' : 'success';
  const threadTone = threads >= 500 ? 'error' : threads >= 200 ? 'warning' : 'success';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>{t('page.system.title')}</h1>
        <p style={subtitleStyle}>{t('page.system.subtitle')}</p>
      </header>

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.system.kpi.heap_usage')} value={heapPct} decimals={1} unit="%" tone={heapTone} hint={`${usedMb} MB / ${totalMb} MB ${t('page.system.kpi.heap_committed')}`} />
        <KpiCard label={t('page.system.kpi.max_heap')} value={maxMb} unit="MB" hint={t('page.system.kpi.heap_xmx')} />
        <KpiCard label={t('page.system.kpi.threads')} value={threads} tone={threadTone} hint={t('page.system.kpi.threads_hint')} />
        <KpiCard label={t('page.system.kpi.cores')} value={cores} hint={t('page.system.kpi.cores_hint')} />
        <KpiCard label={t('page.system.kpi.uptime')} value={Math.round(uptimeMs / 1000)} unit="s" tone="info" hint={formatDuration(uptimeMs)} />
      </div>

      <section className="admin-card">
        <h2>{t('page.system.section.heap')}</h2>
        <ProgressBar pct={Math.min(heapPct, 100)} tone={heapTone} />
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {usedMb} MB / {totalMb} MB {t('page.system.kpi.heap_committed')} (max {maxMb} MB).
        </p>
      </section>

      <section className="admin-card">
        <h2>{t('page.system.section.notes')}</h2>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
          <li>{t('page.system.note.replica')}</li>
          <li>{t('page.system.note.histograms')}</li>
          <li>{t('page.system.note.threads')}</li>
        </ul>
      </section>

      <BackupSection csrfToken={csrfToken} />
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60)    return `${s} s`;
  if (s < 3600)  return `${Math.round(s / 60)} m`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
}

function ProgressBar({ pct, tone }: { pct: number; tone: 'success' | 'warning' | 'error' }) {
  const color = tone === 'error' ? 'var(--error)' : tone === 'warning' ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ width: '100%', height: 12, background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: color,
        boxShadow: `0 0 16px color-mix(in srgb, ${color} 35%, transparent)`,
        transition: 'width 0.4s ease',
      }}/>
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' };
