/**
 * Audit log — every state-changing admin action persisted by
 * AdminAuditService. Action codes get a colour-coded badge so the eye
 * picks out failures (red), 2FA toggles (warning), routine ops (default)
 * at a glance.
 *
 * <h3>V13 rewrite — TanStack Table</h3>
 * Pre-V13 this was a hand-rolled server-rendered table with URL-driven
 * pagination and no header sort. TanStack now backs it: click any
 * header to sort, sort/density/visibility persist per-operator,
 * pagination + page-size are local (URL search still drives the
 * server-side text filter). The toolbar slot keeps the existing
 * TableSearch + Export wired exactly as before — the migration is
 * purely additive for end users.
 */
'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { TableSearch } from '@/app/(admin)/admin/shared/components/TableSearch';
import { ExportButton } from '@/app/(admin)/admin/shared/components/ExportButton';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { ClientTime } from '@/app/(admin)/ClientTime';
import { AdminDataTable } from '@/app/(admin)/admin/shared/components/AdminDataTable';

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
  /** Free-text search term — propagated from the URL. The api already
   *  filtered by it; TanStack table has no extra filtering to do. */
  query?: string;
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
  API_KEY_MINTED:   'warning',
  API_KEY_REVOKED:  'warning',
  API_KEY_ROTATED:  'warning',
  API_KEY_UPDATED:  'info',
  JOB_OVERRIDE_CHANGED: 'info',
};

const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--success)',
  error:   'var(--error)',
  warning: 'var(--warning)',
  info:    'var(--info)',
  default: 'var(--text-secondary)',
};

export function AuditTable({ entries, summary, query = '' }: Props) {
  const summaryEntries = Object.entries(summary)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const columns = useMemo<ColumnDef<AuditEntry, unknown>[]>(() => [
    {
      id: 'action',
      header: 'Action',
      accessorKey: 'action',
      cell: info => <ActionBadge action={info.getValue<string>()} />,
      sortingFn: 'alphanumeric',
    },
    {
      id: 'username',
      header: 'User',
      accessorKey: 'username',
      cell: info => (
        <span style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)' }}>
          {info.getValue<string>()}
        </span>
      ),
    },
    {
      id: 'ip',
      header: 'IP',
      accessorKey: 'ip',
      cell: info => (
        <code style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>
          {info.getValue<string>()}
        </code>
      ),
    },
    {
      id: 'detail',
      header: 'Detail',
      accessorKey: 'detail',
      enableSorting: false,
      cell: info => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {info.getValue<string | null>() ?? '—'}
        </span>
      ),
    },
    {
      id: 'ts',
      header: 'When (Europe/Berlin)',
      accessorKey: 'ts',
      // Default-sort by timestamp descending so newest is on top.
      sortingFn: (a, b) => Date.parse(a.original.ts) - Date.parse(b.original.ts),
      cell: info => (
        <ClientTime
          iso={info.getValue<string>()}
          mode="both"
          style={{ color: 'var(--text-secondary)' }}
        />
      ),
    },
  ], []);

  if (entries.length === 0) {
    return (
      <section className="admin-card">
        <h2>Audit log</h2>
        <EmptyState
          icon="📋"
          title="No audit entries yet"
          hint="State-changing admin actions (logins, password changes, job triggers) will appear here as they happen."
        />
      </section>
    );
  }

  const toolbar = (
    <>
      <TableSearch placeholder="Search action / user / IP / detail…" />
      <ExportButton href="/admin/api/export/audit.csv" filename="audit.csv" compact />
      {summaryEntries.map(([action, count]) => (
        <ActionBadge key={action} action={action} count={count} />
      ))}
    </>
  );

  return (
    <section className="admin-card">
      <h2 style={{ margin: '0 0 0.75rem 0' }}>Audit log</h2>
      <AdminDataTable<AuditEntry>
        pageId="audit"
        data={entries}
        columns={columns}
        // Newest-first by default.
        initialSorting={[{ id: 'ts', desc: true }]}
        toolbar={toolbar}
        emptyState={
          <EmptyState
            icon="🔍"
            title="No matches"
            hint={query ? `No audit entries match "${query}". Adjust the search or clear it to see everything.` : 'No entries.'}
            tone="warning"
          />
        }
      />
    </section>
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
