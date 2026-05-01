'use client';

/**
 * Map-style usage breakdown — donut chart per app. Reads
 * /admin/api/stats/map-styles?app=. Multi-segment donut so the
 * percentage split is visible at a glance: one big slice + a few
 * smaller ones is normal for a tracker like ours where most users
 * stay on the default style.
 *
 * Renders as a stacked-pie SVG (each slice a separate <path>) since
 * our base Donut primitive only supports a single value. Inline
 * because there are usually < 6 styles — a separate component would
 * be over-engineered.
 */
import { useEffect, useState } from 'react';

interface MapStyleRow {
  map_style: string;
  usage_count: number;
  pct_of_total: number;
}

const SEGMENT_COLOURS = [
  'var(--primary-bright)',
  'var(--success)',
  'var(--accent)',
  'var(--info)',
  'var(--warning)',
  'var(--error)',
];

export function MapStyleChart() {
  const [app, setApp] = useState<'web' | 'mobile'>('web');
  const [rows, setRows] = useState<MapStyleRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/admin/api/stats/map-styles?app=${app}`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const data = (await res.json()) as MapStyleRow[];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [app]);

  const total = (rows ?? []).reduce((a, r) => a + r.usage_count, 0);
  const top = rows && rows.length > 0 ? rows[0] : null;

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Map-style usage · {app}</h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {rows === null ? 'Loading…' : rows.length === 0 ? 'No data yet' : `${total.toLocaleString()} style switches today`}
          </span>
        </div>
        <AppToggle value={app} onChange={setApp} />
      </header>

      {rows === null || rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
          Awaiting first aggregation run.
        </p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <StackedDonut rows={rows} />
          <ul style={{ flex: 1, minWidth: 200, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((r, idx) => (
              <li
                key={r.map_style}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '12px 1fr auto',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.8125rem',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: SEGMENT_COLOURS[idx % SEGMENT_COLOURS.length],
                    boxShadow: `0 0 6px ${SEGMENT_COLOURS[idx % SEGMENT_COLOURS.length]}`,
                  }}
                />
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem' }}>
                  {r.map_style}
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.pct_of_total.toFixed(1)}%
                </span>
              </li>
            ))}
            {top && (
              <li style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                Default: <span style={{ color: 'var(--text-primary)' }}>{top.map_style}</span> · {top.pct_of_total.toFixed(1)} %
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Multi-segment donut as one SVG. Each segment is a path with a
 *  large-arc / small-arc flag computed from its angular span. */
function StackedDonut({ rows }: { rows: readonly MapStyleRow[] }) {
  const total = rows.reduce((a, r) => a + r.usage_count, 0);
  if (total === 0) return null;

  const cx = 60, cy = 60, r = 48, stroke = 14;

  // Precompute every segment's start angle in a reduce — avoids a
  // mutable cursor that React's strict-mode would flag as
  // reassigned-after-render. Each entry carries the cumulative
  // start angle so the .map() below stays purely declarative.
  const START = -Math.PI / 2; // 12 o'clock
  const segments = rows.reduce<Array<{
    style: string; pct: number; color: string; angle: number; start: number;
  }>>((acc, row, idx) => {
    const angle = (row.usage_count / total) * Math.PI * 2;
    const prevEnd = acc.length === 0 ? START : acc[acc.length - 1].start + acc[acc.length - 1].angle;
    acc.push({
      style: row.map_style,
      pct: row.pct_of_total,
      color: SEGMENT_COLOURS[idx % SEGMENT_COLOURS.length],
      angle,
      start: prevEnd,
    });
    return acc;
  }, []);

  return (
    <svg viewBox="0 0 120 120" width={140} height={140} style={{ flexShrink: 0 }} aria-hidden>
      {segments.map((s, idx) => {
        const end = s.start + s.angle;
        const x1 = cx + Math.cos(s.start) * r;
        const y1 = cy + Math.sin(s.start) * r;
        const x2 = cx + Math.cos(end) * r;
        const y2 = cy + Math.sin(end) * r;
        const largeArc = s.angle > Math.PI ? 1 : 0;
        const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
        return (
          <path
            key={`${s.style}-${idx}`}
            d={path}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            style={{
              filter: `drop-shadow(0 0 4px ${s.color})`,
              transition: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <title>{s.style}: {s.pct.toFixed(1)}%</title>
          </path>
        );
      })}
      <text x="60" y="56" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontFamily="var(--font-heading)" fontWeight="700">
        {total.toLocaleString()}
      </text>
      <text x="60" y="70" textAnchor="middle" fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-heading)" letterSpacing="2">
        TOTAL
      </text>
    </svg>
  );
}

function AppToggle({ value, onChange }: { value: 'web' | 'mobile'; onChange: (v: 'web' | 'mobile') => void }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', padding: 3, background: 'rgba(15, 29, 50, 0.6)', border: '1px solid var(--border)', borderRadius: 999 }}>
      {(['web', 'mobile'] as const).map((a) => (
        <button
          key={a}
          role="tab"
          aria-selected={value === a}
          onClick={() => onChange(a)}
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
            color: value === a ? 'var(--bg)' : 'var(--text-muted)',
            background: value === a ? 'var(--primary-bright)' : 'transparent',
            transition: 'background 200ms, color 200ms',
          }}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
