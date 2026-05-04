/**
 * Audit log — every state-changing admin action persisted by
 * AdminAuditService. Action codes get a colour-coded badge so the eye
 * picks out failures (red), 2FA toggles (warning), routine ops (default)
 * at a glance.
 *
 * Paginated server-side via the {@code page} URL parameter (default 1).
 * The api returns the most-recent N entries in one shot; we slice for
 * display so the DOM stays manageable and operators can navigate large
 * audit windows without scrolling 200+ rows.
 *
 * Timestamp column shows the absolute Berlin local time
 * ({@code 02.05.2026, 14:23:45}) so operators reading from the EU desk
 * see their wall-clock time. Relative ("5m") is kept as the title
 * tooltip for "how long ago was this".
 */
import Link from 'next/link';
import { TableSearch } from '@/app/(admin)/admin/shared/components/TableSearch';
import { ExportButton } from '@/app/(admin)/admin/shared/components/ExportButton';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { ClientTime } from '@/app/(admin)/ClientTime';

export interface AuditEntry {
  id: number;
  ts: string;
  action: string;
  username: string;
  ip: string;
  detail: string | null;
}

interface Props {
  entries: readonly AuditEntry[];
  summary: Readonly<Record<string, number>>;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** How many rows fit on one page; default 25. */
  pageSize?: number;
  /** Free-text search term — filters action / user / IP / detail substrings. */
  query?: string;
}

/** Case-insensitive substring match across the most-asked-about audit fields. */
function matchesQuery(e: AuditEntry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    e.action.toLowerCase().includes(needle) ||
    e.username.toLowerCase().includes(needle) ||
    e.ip.toLowerCase().includes(needle) ||
    (e.detail ?? '').toLowerCase().includes(needle)
  );
}

type Tone = 'success' | 'error' | 'warning' | 'info' | 'default';

const ACTION_TONE: Record<string, Tone> = {
  LOGIN:            'success',
  LOGIN_FAILED:     'error',
  LOGOUT:           'default',
  PASSWORD_CHANGED: 'warning',
  '2FA_ENABLED':    'warning',
  '2FA_DISABLED':   'warning',
  CLEAR_ERRORS:     'info',
  CLEAR_CACHE:      'info',
  CLEAR_AUDIT:      'error',
  AUDIT_RETENTION:  'default',
};

const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--success)',
  error:   'var(--error)',
  warning: 'var(--warning)',
  info:    'var(--info)',
  default: 'var(--text-secondary)',
};

export function AuditTable({ entries, summary, page = 1, pageSize = 25, query = '' }: Props) {
  const summaryEntries = Object.entries(summary)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Filter first, then paginate — pagination math is on the FILTERED set
  // so "Showing N–M of TOTAL" reflects the search.
  const filtered  = query ? entries.filter((e) => matchesQuery(e, query)) : entries;
  const total      = filtered.length;
  const pageCount  = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(Math.max(1, page), pageCount);
  const startIdx   = (safePage - 1) * pageSize;
  const endIdx     = Math.min(startIdx + pageSize, total);
  const pageRows   = filtered.slice(startIdx, endIdx);

  return (
    <section className="admin-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Audit log</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <TableSearch placeholder="Search action / user / IP / detail…" />
          <ExportButton href="/admin/api/export/audit.csv" filename="audit.csv" compact />
          {summaryEntries.map(([action, count]) => (
            <ActionBadge key={action} action={action} count={count} />
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No audit entries yet"
          hint="State-changing admin actions (logins, password changes, job triggers) will appear here as they happen."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matches"
          hint={`No audit entries match "${query}". Adjust the search or clear it to see everything.`}
          tone="warning"
        />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8125rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <Th>Action</Th>
                  <Th>User</Th>
                  <Th>IP</Th>
                  <Th>Detail</Th>
                  <Th align="right">When (Europe/Berlin)</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((e) => (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <Td>
                      <ActionBadge action={e.action} />
                    </Td>
                    <Td>
                      <span style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)' }}>
                        {e.username}
                      </span>
                    </Td>
                    <Td>
                      <code style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>
                        {e.ip}
                      </code>
                    </Td>
                    <Td>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {e.detail || '—'}
                      </span>
                    </Td>
                    <Td align="right">
                      {/*
                        ClientTime renders absolute Berlin time in SSR
                        (stable across server + client) and swaps in the
                        live relative reading on mount + every 30 s. Fixes
                        the React #418 hydration mismatch the previous
                        suppressHydrationWarning was masking.
                      */}
                      <ClientTime
                        iso={e.ts}
                        mode="both"
                        style={{ color: 'var(--text-secondary)' }}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} pageCount={pageCount} total={total} startIdx={startIdx} endIdx={endIdx} />
        </>
      )}
    </section>
  );
}

function Pagination({
  page, pageCount, total, startIdx, endIdx,
}: {
  page: number; pageCount: number; total: number; startIdx: number; endIdx: number;
}) {
  if (pageCount <= 1) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
        Showing all {total} entries.
      </p>
    );
  }
  // Numeric window — page 1, current ±2, last. Keeps the control compact
  // even with hundreds of pages, while giving direct jumps to common
  // navigation targets (start, near-current, end).
  const window = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const pages = [...window].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const linkStyle = (active: boolean) => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 28,
    height: 28,
    padding: '0 0.5rem',
    fontFamily: 'var(--font-heading)',
    fontSize: '0.75rem',
    color: active ? 'var(--primary-bright)' : 'var(--text-secondary)',
    background: active ? 'color-mix(in srgb, var(--primary-bright) 12%, transparent)' : 'transparent',
    border: `1px solid ${active ? 'color-mix(in srgb, var(--primary-bright) 28%, transparent)' : 'var(--border)'}`,
    borderRadius: 4,
    textDecoration: 'none' as const,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        Showing {startIdx + 1}–{endIdx} of {total}
      </span>
      <nav style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap' }} aria-label="Audit log pagination">
        {page > 1 && (
          <Link href={{ query: { page: page - 1 } }} style={linkStyle(false)} prefetch={false}>‹ Prev</Link>
        )}
        {pages.map((n, i) => {
          const prev = pages[i - 1];
          const gap = prev != null && n - prev > 1;
          return (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              {gap && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0 0.25rem' }}>…</span>}
              {n === page ? (
                <span style={linkStyle(true)} aria-current="page">{n}</span>
              ) : (
                <Link href={{ query: { page: n } }} style={linkStyle(false)} prefetch={false}>{n}</Link>
              )}
            </span>
          );
        })}
        {page < pageCount && (
          <Link href={{ query: { page: page + 1 } }} style={linkStyle(false)} prefetch={false}>Next ›</Link>
        )}
      </nav>
    </div>
  );
}

function ActionBadge({ action, count }: { action: string; count?: number }) {
  const tone = ACTION_TONE[action] ?? 'default';
  const color = TONE_COLOR[tone];
  return (
    <span
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
        padding: '2px 8px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {action}
      {count != null && (
        <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontWeight: 500 }}>
          {count}
        </span>
      )}
    </span>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        fontFamily: 'var(--font-heading)',
        fontSize: '0.625rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontWeight: 700,
        padding: '0.5rem 0.75rem',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td style={{ padding: '0.5rem 0.75rem', textAlign: align }}>
      {children}
    </td>
  );
}
