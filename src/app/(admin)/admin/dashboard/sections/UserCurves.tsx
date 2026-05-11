'use client';

/**
 * Concurrent-user time series, one chart per app (web vs mobile).
 * Same shape as LoadCurves but reads /admin/api/monitoring/users
 * which returns http_sessions + ws_sessions per minute.
 */
import { useEffect, useMemo, useState } from 'react';
import { RechartsLineChart as LineChart, type Series } from '@/app/(admin)/admin/shared/charts/RechartsLineChart';
import { TimeRangePicker, RANGES } from '@/app/(admin)/admin/shared/components/TimeRangePicker';
import { AppToggle, type App } from '@/app/(admin)/admin/shared/components/AppToggle';

interface UserRow {
  bucket_at: string;
  http_sessions: number;
  ws_sessions: number;
  peak_total: number;
}

export function UserCurves() {
  const [range, setRange]   = useState<string>('1h');
  const [app, setApp]       = useState<App>('web');
  const [rows, setRows]     = useState<UserRow[] | null>(null);
  const [loading, setLoad]  = useState(false);

  const minutes = RANGES.find((r) => r.key === range)?.minutes ?? 60;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoad(true); });
    (async () => {
      try {
        const res = await fetch(`/admin/api/monitoring/users?app=${app}&minutes=${minutes}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const data = (await res.json()) as UserRow[];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoad(false);
      }
    })();
    return () => { cancelled = true; };
  }, [app, minutes]);

  const series: Series[] = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const xs = rows.map((r) => new Date(r.bucket_at).getTime());
    return [
      {
        id: 'http',
        label: 'HTTP sessions',
        color: 'var(--info)',
        points: rows.map((r, i) => ({ t: xs[i], v: r.http_sessions })),
      },
      {
        id: 'ws',
        label: 'WS sessions',
        color: 'var(--success)',
        points: rows.map((r, i) => ({ t: xs[i], v: r.ws_sessions })),
      },
      {
        id: 'peak',
        label: 'Peak total',
        color: 'var(--accent)',
        points: rows.map((r, i) => ({ t: xs[i], v: r.peak_total })),
      },
    ];
  }, [rows]);

  const peakNow = rows && rows.length > 0 ? rows[rows.length - 1].peak_total : 0;

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Concurrent users · {app}</h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : rows?.length === 0 ? 'No samples in range' : `current peak ${peakNow}`}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <AppToggle value={app} onChange={setApp} activeColor="var(--accent)" />
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
      </header>
      <LineChart
        series={series}
        yLabel="Sessions"
        xFormat="auto"
        height={220}
      />
    </section>
  );
}

