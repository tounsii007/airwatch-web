/**
 * Security view — full operator console for auth + abuse signals.
 *
 * The dashboard's SecurityRow shows a 2-card preview (top offenders,
 * live tail). This page extends that with the full audit log,
 * a daily-history chart, and a wider KPI strip — the page operators
 * land on when investigating "who hit us, when, with what".
 *
 * Server-rendered. The LiveFeed embedded inside refreshes itself.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import type { BlockedIp, RejectEvent } from '@/app/(admin)/admin/dashboard/types';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { HBar } from '@/app/(admin)/admin/shared/charts/HBar';
import { LiveFeed } from '@/app/(admin)/admin/dashboard/sections/LiveFeed';
import { AuditTable, type AuditEntry } from '@/app/(admin)/admin/security/AuditTable';
import { AuditHistoryChart, type AuditDailyPoint } from '@/app/(admin)/admin/security/AuditHistoryChart';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { AuditSavedViews } from '@/app/(admin)/admin/security/AuditSavedViews';

const SECURITY_RUNBOOK = `
# Sources
- **Live feed** — every blocked request as it happens (HMAC mismatch, rate limit, missing auth)
- **Top offenders** — IPs with the most blocked attempts in the last hour
- **Audit log** — every operator action, hash-chained (Phase 1.2)
- **Daily history** — rolling 30-day audit count for spotting unusual activity

# Triage flow
1. Live feed shows a burst → check Top offenders for the offending IP
2. Use \`/admin/api/geoip\` to identify the source country / ISP
3. Decide: rate-limit harder, geofence-block, or open an incident if it's a real attack
4. Audit log shows what operators did before / during the spike — useful for postmortem

# Hash-chain integrity
\`/admin/api/audit/verify\` walks the chain from oldest to newest. ANY mismatch indicates someone wrote to the table outside the AdminAuditService — investigate immediately.
`;

interface AuditPayload {
  total: number;
  entries: AuditEntry[];
  summary: Record<string, number>;
}

interface AuditHistoryPayload {
  days: number;
  series: AuditDailyPoint[];
  last24h: number;
}

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const query = (sp.q ?? '').trim();
  // Server-side filter — the api now does the LIKE-search across
  // action / username / ip / detail in JPA, so we don't ship 2000 rows
  // and filter them in the browser.
  const auditUrl = query
    ? `/admin/api/audit?q=${encodeURIComponent(query)}&limit=500`
    : '/admin/api/audit';
  const [audit, history, blocked, recent] = await Promise.all([
    fetchJson<AuditPayload>(auditUrl),
    fetchJson<AuditHistoryPayload>('/admin/api/audit/history?days=30'),
    fetchJson<BlockedIp[]>('/admin/api/monitoring/unauthorized-ips?limit=50'),
    fetchJson<RejectEvent[]>('/admin/api/monitoring/unauthorized-events?limit=50'),
  ]);

  const blockedTotal = blocked?.reduce((a, b) => a + b.attempt_count, 0) ?? 0;
  const uniqueIps    = blocked?.length ?? 0;
  const loginFailed  = audit?.summary?.LOGIN_FAILED ?? 0;
  const loginOk      = audit?.summary?.LOGIN ?? 0;
  const last24h      = history?.last24h ?? 0;
  const auditTotal   = audit?.total ?? 0;

  const topOffenders = (blocked ?? []).slice(0, 10).map((b) => ({
    label: b.country_code ? `${b.ip} (${b.country_code})` : b.ip,
    value: b.attempt_count,
    color: 'var(--error)',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <HelpPanel pageId="security" markdown={SECURITY_RUNBOOK} />
      <header>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: 'var(--primary-bright)',
          }}
        >
          Security
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 }}>
          Auth events, blocked IPs, audit trail. Server-side gates: AdminAuthFilter + LoginThrottleService.
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
          label="BLOCKED ATTEMPTS"
          value={blockedTotal}
          tone={blockedTotal === 0 ? 'success' : 'error'}
          hint={`${uniqueIps} unique IPs`}
        />
        <KpiCard
          label="LOGIN FAILURES"
          value={loginFailed}
          tone={loginFailed === 0 ? 'success' : loginFailed < 10 ? 'warning' : 'error'}
          hint={`${loginOk} successful logins`}
        />
        <KpiCard
          label="AUDIT EVENTS · 24H"
          value={last24h}
          tone="info"
          hint="all admin actions"
        />
        <KpiCard
          label="AUDIT TOTAL"
          value={auditTotal}
          tone="default"
          hint="lifetime entries"
        />
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
        className="admin-grid-2col"
      >
        <section className="admin-card">
          <h2>Top offenders by attempt count</h2>
          {topOffenders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No blocked IPs recorded yet.
            </p>
          ) : (
            <HBar items={topOffenders} />
          )}
        </section>
        <section className="admin-card">
          <h2>Live rejection feed</h2>
          <LiveFeed initial={recent ?? []} />
        </section>
      </div>

      <AuditHistoryChart series={history?.series ?? []} />

      {/* Phase 3.4 — operator-defined bookmarks for the audit filter set.
          Stored in localStorage so each browser keeps its own set; switch
          views by clicking, save the current filter combo with "+ Save current". */}
      <AuditSavedViews currentQuery={query} currentPage={page} />

      <AuditTable entries={audit?.entries ?? []} summary={audit?.summary ?? {}} page={page} query={query} />
    </div>
  );
}
