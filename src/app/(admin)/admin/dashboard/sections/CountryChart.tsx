'use client';

/**
 * Top-10 originating countries per app. Reads
 * /admin/api/stats/countries?app=&limit=10 and renders an HBar with
 * each row's country code + flag + percentage.
 *
 * Mirrors the visual language of the Top-Offenders bar so an operator
 * scanning the dashboard reads "high bar = lots of users from there"
 * without having to relearn the chart for each panel.
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { HBar } from '@/app/(admin)/admin/shared/charts/HBar';
import { AppToggle, type App } from '@/app/(admin)/admin/shared/components/AppToggle';

interface CountryRow {
  country_code: string;
  user_count: number;
  pct_of_total: number;
}

const COLOURS = ['var(--info)', 'var(--success)', 'var(--accent)', 'var(--warning)', 'var(--primary-bright)'];

export function CountryChart() {
  const [app, setApp] = useState<App>('web');
  const [rows, setRows] = useState<CountryRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/admin/api/stats/countries?app=${app}&limit=10`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const data = (await res.json()) as CountryRow[];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [app]);

  const items = (rows ?? []).map((r, idx) => ({
    label: countryLabel(r.country_code),
    value: r.user_count,
    color: COLOURS[idx % COLOURS.length],
    badge: r.country_code !== 'XX' ? (
      <Image
        src={`/flags/${r.country_code.toLowerCase()}.svg`}
        alt=""
        width={16}
        height={12}
        unoptimized
        className=""
        style={{ borderRadius: 2, verticalAlign: 'middle' }}
      />
    ) : <span style={{ color: 'var(--text-muted)' }}>?</span>,
  }));

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Top-10 countries · {app}</h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {rows === null ? 'Loading…' : rows.length === 0 ? 'No data — aggregator runs at 02:00 / 10:00 / 18:00 UTC' : `${rows.reduce((a, r) => a + r.user_count, 0)} unique users`}
          </span>
        </div>
        <AppToggle value={app} onChange={setApp} />
      </header>
      {rows && rows.length > 0 ? (
        <HBar items={items} format={(n) => n.toLocaleString()} />
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
          Awaiting first aggregation run.
        </p>
      )}
    </section>
  );
}

/** Two-letter code → display label. "XX" sentinel from the aggregator
 *  means "geo-IP unknown" — show it as such. */
function countryLabel(code: string): string {
  if (!code || code === 'XX') return 'Unknown';
  // ISO-3166 alpha-2 → emoji flag is computed by adding 127 397 to each
  // character's UTF-16 value (regional-indicator characters). Browsers
  // that have an emoji font render it; older Windows browsers fall
  // back to the bare letters which is fine.
  const flag = String.fromCodePoint(...[...code.toUpperCase()].map((c) => c.charCodeAt(0) + 127_397));
  return `${flag}  ${code.toUpperCase()}`;
}

