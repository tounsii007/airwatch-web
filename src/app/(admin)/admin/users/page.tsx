/**
 * Users / Sessions view — active HTTP + WS sessions, peaks, recent
 * connection history, plus the registry of authenticated admin sessions.
 *
 * Each admin session row carries a "Kick" button that POSTs to
 * /admin/sessions/{sid}/kick. The caller's own session is NOT kicked
 * by the server (AdminController guards against that).
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { RechartsLineChart as LineChart, type Series } from '@/app/(admin)/admin/shared/charts/RechartsLineChart';
import { relativeTime } from '@/app/(admin)/admin/dashboard/utils';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { ExportButton } from '@/app/(admin)/admin/shared/components/ExportButton';
import { ActionResultToast } from '@/app/(admin)/ActionResultToast';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';

const USERS_RUNBOOK = `
# What's tracked here
- **HTTP sessions** — open Tomcat sessions across both api replicas (sum)
- **WS sessions** — active WebSocket connections per replica
- **Admin sessions** — authenticated operator browsers (Redis pointer per username)

# Bulk-kick affordances (Phase 2.11)
- **Kick stale (>24h)** — sweep dormant sessions (laptops on sleep, lingering tabs)
- **Kick all but me** — emergency: suspected stolen cookie; one click flushes every other admin browser

Both preserve YOUR current session via the server-side keep-id check.

# Per-row Kick
Targets a single sessionId. The victim's next request hits the AdminAuthFilter pointer-check, returns 401, and their browser redirects to /admin/login. The Redis row is deleted; no leftover session pollution.
`;

interface ClientSession {
  id: string;
  ipHash: string;
  userAgent: string;
  firstSeen: string;
  lastSeen: string;
  requestCount: number;
}

interface HistoryPoint {
  epochMs: number;
  httpSessions: number;
  wsSessions: number;
}

interface AdminSession {
  sessionId: string;
  username: string;
  created: string;
  lastAccess: string;
}

interface UsersPayload {
  httpSessions: number;
  wsSessions: number;
  peakHttp: number;
  peakWs: number;
  sessions: ClientSession[];
  history: HistoryPoint[];
  adminSessions: AdminSession[];
}

interface AnnotationsPayload {
  annotations: Array<{ t: number; label: string; kind: string }>;
}

export default async function AdminUsersPage() {
  const [data, csrfToken, annPayload] = await Promise.all([
    fetchJson<UsersPayload>('/admin/api/users'),
    fetchCsrfToken(),
    // Phase 3.2 — pull the last 24h of operator events to overlay the
    // sessions chart with deploy / incident / maintenance markers.
    fetchJson<AnnotationsPayload>(
      `/admin/api/chart-annotations?fromMs=${Date.now() - 24 * 60 * 60 * 1000}&toMs=${Date.now()}`),
  ]);

  const httpSessions  = data?.httpSessions ?? 0;
  const wsSessions    = data?.wsSessions ?? 0;
  const peakHttp      = data?.peakHttp ?? 0;
  const peakWs        = data?.peakWs ?? 0;
  const sessions      = data?.sessions ?? [];
  const history       = data?.history ?? [];
  const adminSessions = data?.adminSessions ?? [];
  const annotations   = (annPayload?.annotations ?? []).map(a => ({
    t: a.t,
    label: a.label,
    kind: a.kind as 'deploy' | 'incident' | 'maintenance' | 'note' | undefined,
  }));

  const series: Series[] = [
    { id: 'http', label: 'HTTP', color: 'var(--info)',    points: history.map((h) => ({ t: h.epochMs, v: h.httpSessions })) },
    { id: 'ws',   label: 'WS',   color: 'var(--primary)', points: history.map((h) => ({ t: h.epochMs, v: h.wsSessions })) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ActionResultToast successMessages={{
        kicked_all_but_me: 'All other admin sessions kicked. Yours is unaffected.',
        kicked_stale:      'Stale sessions cleared.',
      }} />
      <header>
        <h1 style={headingStyle}>Users &amp; sessions</h1>
        <p style={subtitleStyle}>Active connections across both api replicas, plus authenticated admin sessions.</p>
      </header>

      <HelpPanel pageId="users" markdown={USERS_RUNBOOK} />

      <div style={kpiGridStyle}>
        <KpiCard label="HTTP SESSIONS" value={httpSessions} tone="info" hint={`peak ${peakHttp}`} />
        <KpiCard label="WS SESSIONS"   value={wsSessions}   tone="info" hint={`peak ${peakWs}`} />
        <KpiCard label="ADMIN SESSIONS" value={adminSessions.length} tone={adminSessions.length > 1 ? 'warning' : 'default'} hint="authenticated operators" />
      </div>

      <section className="admin-card">
        <h2>Sessions · last {history.length} minutes</h2>
        {/* xFormat is a STRING preset (not a function) so this server
            component can pass it to the client-side RechartsLineChart
            across the React Server Components boundary. */}
        {/* Phase 3.2 — annotations overlay the sessions chart with operator
            events. Phase 3.3 — Brush enables zoom + pan since the y-range
            sometimes shows interesting detail buried under spikes. */}
        <LineChart
          series={series}
          height={200}
          yLabel="sessions"
          xFormat="time"
          annotations={annotations}
          enableZoom
        />
      </section>

      <section className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Authenticated admin sessions</h2>
          {csrfToken && adminSessions.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Phase 2.11 — bulk-kick affordances. "Kick all but me" is
                  the emergency button (suspected stolen cookie); "Kick
                  stale" is the routine sweep that clears dormant sessions
                  (laptops on sleep, etc.). Both preserve the caller's
                  current session via the server-side keepId check. */}
              <form method="post" action="/admin/sessions/kick-stale" style={{ display: 'inline' }}>
                <input type="hidden" name="_csrf" value={csrfToken} />
                <input type="hidden" name="thresholdMin" value="1440" />
                <button
                  type="submit"
                  style={kickAllButtonStyle('var(--warning)')}
                  title="Kick every session idle for more than 24 hours"
                >
                  Kick stale (&gt;24h)
                </button>
              </form>
              <form
                method="post"
                action="/admin/sessions/kick-all-but-me"
                style={{ display: 'inline' }}
                onSubmit={undefined /* server-side confirmation only — keep simple */}
              >
                <input type="hidden" name="_csrf" value={csrfToken} />
                <button
                  type="submit"
                  style={kickAllButtonStyle('var(--error)')}
                  title="Kick every other admin session except this one"
                >
                  Kick all but me
                </button>
              </form>
            </div>
          )}
        </div>
        {adminSessions.length === 0 ? (
          <EmptyState
            icon="∅"
            title="No admin sessions"
            hint="Including this one. The session registry is empty — usually means an in-memory restart wiped Tomcat sessions before Spring Session/Redis took over. New logins will populate it."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <Th>User</Th>
                  <Th>Session ID</Th>
                  <Th align="right">Logged in</Th>
                  <Th align="right">Last seen</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {adminSessions.map((s) => (
                  <tr key={s.sessionId} style={{ borderTop: '1px solid var(--border)' }}>
                    <Td>
                      <span style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)' }}>{s.username}</span>
                    </Td>
                    <Td><code style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>{s.sessionId.slice(0, 12)}…</code></Td>
                    <Td align="right"><span style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{relativeTime(s.created)}</span></Td>
                    <Td align="right"><span style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{relativeTime(s.lastAccess)}</span></Td>
                    <Td align="right">
                      {csrfToken && (
                        <form method="post" action={`/admin/sessions/${encodeURIComponent(s.sessionId)}/kick`} style={{ display: 'inline' }}>
                          <input type="hidden" name="_csrf" value={csrfToken} />
                          <button type="submit" style={kickButtonStyle}>Kick</button>
                        </form>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Active client sessions ({sessions.length})</h2>
          {sessions.length > 0 && (
            <ExportButton href="/admin/api/export/sessions.csv" filename="sessions.csv" compact />
          )}
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            icon="✓"
            title="No active client sessions"
            hint="No public users connected right now. SessionTrackerService prunes idle sessions after the inactivity window — quiet periods are normal off-hours."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <Th>ID (truncated)</Th>
                  <Th>IP hash</Th>
                  <Th>User-Agent</Th>
                  <Th align="right">Requests</Th>
                  <Th align="right">First seen</Th>
                  <Th align="right">Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <Td><code style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>{s.id.slice(0, 12)}…</code></Td>
                    <Td><code style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>{s.ipHash}</code></Td>
                    <Td><span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{truncateUA(s.userAgent)}</span></Td>
                    <Td align="right">{s.requestCount.toLocaleString()}</Td>
                    <Td align="right"><span style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{relativeTime(s.firstSeen)}</span></Td>
                    <Td align="right"><span style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{relativeTime(s.lastSeen)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function truncateUA(ua: string): string {
  if (!ua) return '—';
  // Strip common version cruft to keep the column scannable; the real UA
  // is still in the audit log if forensics needs it.
  return ua.length > 60 ? ua.slice(0, 57) + '…' : ua;
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' as const };
const kickButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--error)',
  background: 'color-mix(in srgb, var(--error) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 28%, transparent)',
  padding: '0.3rem 0.7rem',
  borderRadius: 3,
  cursor: 'pointer',
};
function kickAllButtonStyle(color: string): React.CSSProperties {
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color,
    background: `color-mix(in srgb, ${color} 10%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
    padding: '0.4rem 0.85rem',
    borderRadius: 4,
    cursor: 'pointer' as const,
  };
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ textAlign: align, fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, padding: '0.5rem 0.75rem' }}>{children}</th>;
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '0.5rem 0.75rem', textAlign: align }}>{children}</td>;
}
