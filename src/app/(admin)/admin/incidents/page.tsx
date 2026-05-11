/**
 * Incidents view (Phase 2.2) — operator-managed incident lifecycle.
 *
 * Lists open + recent incidents with stats, lets operators open a new
 * one (manual or from-an-alert), close existing ones, and write
 * postmortem notes.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { ActionResultToast } from '@/app/(admin)/ActionResultToast';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { IncidentsClient } from '@/app/(admin)/admin/incidents/IncidentsClient';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

interface Incident {
  id: number;
  title: string;
  severity: string;
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  started_by: string;
  ended_by: string | null;
  summary: string | null;
  postmortem: string | null;
  linked_alerts: number;
}

interface IncidentsPayload {
  stats: { open: number; total7d: number; avgMin30d: number };
  incidents: Incident[];
}

const RUNBOOK = `
# What an incident is here
A grouping object for related alerts so you can write **one** postmortem against the whole event instead of per-alert. Open/close lifecycle:

- **Open** — manually, or "from this alert" (one-click from the dashboard alerts panel)
- **Link** — attach more alerts as they fire
- **Postmortem** — markdown notes; written while it's fresh
- **Close** — sets duration, freezes the timeline

# When to open one
- Two or more alerts within the same 30 min that share a likely cause
- Any production-impacting event you'd want to reference later
- Anything an operator was paged for

Don't open one for every minor warning — keep this signal high.

# Severity
Match the worst alert in the group. \`critical\` shows in red across the dashboard; \`info\` is mostly for record-keeping.
`;

export default async function IncidentsPage() {
  const [data, csrfToken, locale] = await Promise.all([
    fetchJson<IncidentsPayload>('/admin/api/incidents?limit=50'),
    fetchCsrfToken(),
    getLocale(),
  ]);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);

  const stats     = data?.stats    ?? { open: 0, total7d: 0, avgMin30d: 0 };
  const incidents = data?.incidents ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ActionResultToast successMessages={{
        opened:  'Incident opened.',
        closed:  'Incident closed.',
        updated: 'Postmortem saved.',
      }} />

      <header>
        <h1 style={headingStyle}>{t('page.incidents.title')}</h1>
        <p style={subtitleStyle}>{t('page.incidents.subtitle')}</p>
      </header>

      <HelpPanel pageId="incidents" markdown={RUNBOOK} />

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.incidents.kpi.open')}        value={stats.open}     tone={stats.open > 0 ? 'warning' : 'success'} hint={stats.open === 0 ? t('page.incidents.kpi.open_hint_ok') : t('page.incidents.kpi.open_hint_bad')} />
        <KpiCard label={t('page.incidents.kpi.opened_7d')}   value={stats.total7d}  hint={t('page.incidents.kpi.opened_7d_hint')} />
        <KpiCard label={t('page.incidents.kpi.avg_30d')} value={stats.avgMin30d} unit=" min" decimals={1} hint={t('page.incidents.kpi.avg_30d_hint')} />
      </div>

      <IncidentsClient initialIncidents={incidents} csrfToken={csrfToken} />
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' };
