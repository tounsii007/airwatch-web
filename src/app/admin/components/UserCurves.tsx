'use client';

/**
 * Concurrent-user time series, one chart per app (web vs mobile).
 * Same shape as LoadCurves but reads /admin/api/monitoring/users
 * which returns http_sessions + ws_sessions per minute.
 */
import { useEffect, useMemo, useState } from 'react';
import { LineChart, type Series } from '@/app/admin/charts/LineChart';
import { TimeRangePicker, RANGES } from '@/app/admin/components/TimeRangePicker';

interface UserRow {
  bucket_at: string;
  http_sessions: number;
  ws_sessions: number;
  peak_total: number;
}

export function UserCurves() {
  const [range, setRange]   = useState<string>('1h');
  const [app, setApp]       = useState<'web' | 'mobile'>('web');
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
          <div role="tablist" aria-label="App" style={{ display: 'inline-flex', gap: 0, padding: 3, background: 'rgba(15, 29, 50, 0.6)', border: '1px solid var(--border)', borderRadius: 999 }}>
            {(['web', 'mobile'] as const).map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={app === a}
                onClick={() => setApp(a)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: app === a ? 'var(--bg)' : 'var(--text-muted)',
                  background: app === a ? 'var(--accent)' : 'transparent',
                  transition: 'background 200ms, color 200ms',
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
      </header>
      <LineChart
        series={series}
        yLabel="Sessions"
        xFormat={(t) => formatTick(t, minutes)}
        height={220}
      />
    </section>
  );
}

function formatTick(t: number, minutes: number): string {
  const d = new Date(t);
  if (minutes <= 1440) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (minutes <= 44_640) return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
}
