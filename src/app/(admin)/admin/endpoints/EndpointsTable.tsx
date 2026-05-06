/**
 * Per-endpoint metrics table — TanStack-backed.
 *
 * Replaces the hand-rolled `<table>` in {@code endpoints/page.tsx} with
 * a sortable / paginated view. Operators most often need to sort by
 * p95, by call count, or by error rate (the previous "always sorted by
 * count" was effectively a sort lock); now any header click works.
 *
 * Server-rendered data is passed as a prop and rendered client-side.
 * The CSV export uses the original server endpoint and is unaffected
 * by client-side sorting — that's fine, it's "what the api saw" not
 * "what the operator filtered".
 */
'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { ExportButton } from '@/app/(admin)/admin/shared/components/ExportButton';
import { AdminDataTable } from '@/app/(admin)/admin/shared/components/AdminDataTable';
import { ClientTime } from '@/app/(admin)/ClientTime';

export interface EndpointRow {
  method: string;
  path: string;
  count: number;
  errors: number;
  errorRate: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  inFlight: number;
  lastCalled: number;
}

const METHOD_COLOR: Record<string, string> = {
  GET:    'var(--success)',
  POST:   'var(--info)',
  PUT:    'var(--warning)',
  PATCH:  'var(--warning)',
  DELETE: 'var(--error)',
};

interface Props {
  rows: readonly EndpointRow[];
}

export function EndpointsTable({ rows }: Props) {
  const columns = useMemo<ColumnDef<EndpointRow, unknown>[]>(() => [
    {
      id: 'method',
      header: 'Method',
      accessorKey: 'method',
      cell: info => <span style={methodPillStyle(info.getValue<string>())}>{info.getValue<string>()}</span>,
    },
    {
      id: 'path',
      header: 'Path',
      accessorKey: 'path',
      cell: info => (
        <code style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>
          {info.getValue<string>()}
        </code>
      ),
    },
    {
      id: 'count',
      header: 'Calls',
      accessorKey: 'count',
      cell: info => <div style={{ textAlign: 'right' }}>{info.getValue<number>().toLocaleString()}</div>,
    },
    {
      id: 'errors',
      header: 'Errors',
      accessorKey: 'errors',
      cell: info => {
        const v = info.getValue<number>();
        return (
          <div style={{ textAlign: 'right', color: v > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
            {v}
          </div>
        );
      },
    },
    {
      id: 'errorRate',
      header: 'Err%',
      accessorKey: 'errorRate',
      cell: info => {
        const v = info.getValue<number>();
        return (
          <div style={{
            textAlign: 'right',
            color: v >= 5 ? 'var(--error)' : v >= 1 ? 'var(--warning)' : 'var(--text-muted)',
          }}>{v.toFixed(2)}%</div>
        );
      },
    },
    {
      id: 'avgMs',
      header: 'Avg',
      accessorKey: 'avgMs',
      cell: info => <div style={{ textAlign: 'right' }}>{info.getValue<number>().toFixed(1)} ms</div>,
    },
    {
      id: 'p95Ms',
      header: 'p95',
      accessorKey: 'p95Ms',
      cell: info => {
        const v = info.getValue<number>();
        return (
          <div style={{
            textAlign: 'right',
            color: v >= 2000 ? 'var(--error)' : v >= 500 ? 'var(--warning)' : 'var(--text-primary)',
          }}>{v} ms</div>
        );
      },
    },
    {
      id: 'maxMs',
      header: 'Max',
      accessorKey: 'maxMs',
      cell: info => <div style={{ textAlign: 'right' }}>{info.getValue<number>()} ms</div>,
    },
    {
      id: 'inFlight',
      header: 'In-flight',
      accessorKey: 'inFlight',
      cell: info => <div style={{ textAlign: 'right' }}>{info.getValue<number>()}</div>,
    },
    {
      id: 'lastCalled',
      header: 'Last call',
      accessorKey: 'lastCalled',
      cell: info => {
        const v = info.getValue<number>();
        if (v <= 0) return <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>—</div>;
        return (
          <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
            <ClientTime iso={new Date(v).toISOString()} mode="relative" />
          </div>
        );
      },
    },
  ], []);

  return (
    <AdminDataTable<EndpointRow>
      pageId="endpoints"
      data={rows}
      columns={columns}
      // Default to descending call count — busiest first, matches the
      // pre-V13 default and is what operators expect when scanning.
      initialSorting={[{ id: 'count', desc: true }]}
      defaultPageSize={50}
      pageSizeOptions={[25, 50, 100, 250]}
      toolbar={
        <ExportButton href="/admin/api/export/endpoints.csv" filename="endpoints.csv" compact />
      }
    />
  );
}

function methodPillStyle(method: string) {
  const color = METHOD_COLOR[method] ?? 'var(--text-muted)';
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
    padding: '2px 6px',
    borderRadius: 3,
    whiteSpace: 'nowrap' as const,
    display: 'inline-block' as const,
  };
}
