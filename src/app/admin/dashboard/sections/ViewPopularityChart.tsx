'use client';

/**
 * Top-10 most-visited routes per app. Reads
 * /admin/api/stats/views?app=&limit=10. Same HBar treatment as
 * CountryChart — keeps the dashboard's visual rhythm consistent.
 *
 * Routes are normalised by the api before storage (`/flight/abc123`
 * → `/flight/:id`) so popularity actually reflects "how many times
 * the user opened a flight detail" rather than spreading across
 * thousands of one-hit unique paths.
 */
import { useEffect, useState } from 'react';
import { HBar } from '@/app/admin/shared/charts/HBar';
import { AppToggle, type App } from '@/app/admin/shared/components/AppToggle';

interface ViewRow {
  route_path: string;
  view_count: number;
  pct_of_total: number;
}

const COLOURS = ['var(--primary-bright)', 'var(--info)', 'var(--success)', 'var(--accent)', 'var(--warning)'];

export function ViewPopularityChart() {
  const [app, setApp] = useState<App>('web');
  const [rows, setRows] = useState<ViewRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/admin/api/stats/views?app=${app}&limit=10`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const data = (await res.json()) as ViewRow[];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [app]);

  const items = (rows ?? []).map((r, idx) => ({
    label: r.route_path,
    value: r.view_count,
    color: COLOURS[idx % COLOURS.length],
  }));

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Top-10 routes · {app}</h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {rows === null ? 'Loading…' : rows.length === 0 ? 'No data — aggregator runs 3×/day' : `${rows.reduce((a, r) => a + r.view_count, 0).toLocaleString()} views today`}
          </span>
        </div>
        <AppToggle value={app} onChange={setApp} />
      </header>
      {rows && rows.length > 0 ? (
        <HBar items={items} unit="" />
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
          Awaiting first aggregation run.
        </p>
      )}
    </section>
  );
}

