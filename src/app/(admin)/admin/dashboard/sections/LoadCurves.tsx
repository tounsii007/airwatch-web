'use client';

/**
 * Reactive load-curve panel — multi-instance CPU + heap + thread-count
 * over a user-selectable time range. Wraps LineChart with a metric switch
 * (CPU % | Heap MB | Threads | Req/s | Replicas) and the TimeRangePicker.
 *
 * Fetches /admin/api/monitoring/loads on every range or service change.
 * The api down-samples server-side so even a 1-year range returns ≤ 600
 * rows × N instances — the chart renders fast.
 */
import { useEffect, useMemo, useState } from 'react';
import { RechartsLineChart as LineChart, type Series } from '@/app/(admin)/admin/shared/charts/RechartsLineChart';
import { TimeRangePicker, RANGES } from '@/app/(admin)/admin/shared/components/TimeRangePicker';

interface LoadRow {
  bucket_at: string;
  instance_id: string;
  cpu_pct: number | null;
  heap_used_mb: number | null;
  heap_max_mb: number | null;
  thread_count: number | null;
  request_rate: number | null;
  replica_count: number | null;
}

type Metric = 'cpu_pct' | 'heap_used_mb' | 'thread_count' | 'request_rate' | 'replica_count';

const METRIC_LABEL: Record<Metric, string> = {
  cpu_pct:       'CPU %',
  heap_used_mb:  'Heap MB',
  thread_count:  'Threads',
  request_rate:  'Req / s',
  replica_count: 'Replicas',
};

const METRIC_UNIT: Record<Metric, string> = {
  cpu_pct:       ' %',
  heap_used_mb:  ' MB',
  thread_count:  '',
  request_rate:  '',
  replica_count: '',
};

const COLOURS = [
  'var(--info)',
  'var(--success)',
  'var(--accent)',
  'var(--warning)',
  'var(--primary-bright)',
  'var(--error)',
];

export function LoadCurves({ defaultService = 'api' }: { defaultService?: string }) {
  const [range, setRange]       = useState<string>('1h');
  const [service, setService]   = useState<string>(defaultService);
  const [metric, setMetric]     = useState<Metric>('cpu_pct');
  const [rows, setRows]         = useState<LoadRow[] | null>(null);
  const [loading, setLoading]   = useState(false);

  const minutes = RANGES.find((r) => r.key === range)?.minutes ?? 60;

  useEffect(() => {
    let cancelled = false;
    // Defer the loading-flag flip onto a microtask so React doesn't see
    // a synchronous setState inside the effect body — the actual fetch
    // is already async via the promise chain below.
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    (async () => {
      try {
        const res = await fetch(`/admin/api/monitoring/loads?service=${service}&minutes=${minutes}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const data = (await res.json()) as LoadRow[];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [service, minutes]);

  // Group rows by instance → series for the chart.
  const series: Series[] = useMemo(() => {
    if (!rows) return [];
    const byInstance = new Map<string, LoadRow[]>();
    for (const r of rows) {
      const list = byInstance.get(r.instance_id) ?? [];
      list.push(r);
      byInstance.set(r.instance_id, list);
    }
    return [...byInstance.entries()].map(([instance, list], idx) => ({
      id: instance,
      label: instance,
      color: COLOURS[idx % COLOURS.length],
      points: list.map((r) => ({
        t: new Date(r.bucket_at).getTime(),
        v: r[metric] != null ? Number(r[metric]) : null,
      })),
    }));
  }, [rows, metric]);

  return (
    <section className="admin-card">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>{service.toUpperCase()} · {METRIC_LABEL[metric]}</h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : rows?.length === 0 ? 'No samples in range' : `${series.length} instance${series.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            style={selectStyle()}
            aria-label="Service"
          >
            <option value="api">api</option>
            <option value="web">web</option>
            <option value="mobile">mobile</option>
          </select>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            style={selectStyle()}
            aria-label="Metric"
          >
            {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
              <option key={m} value={m}>{METRIC_LABEL[m]}</option>
            ))}
          </select>
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
      </header>
      <LineChart
        series={series}
        yLabel={METRIC_LABEL[metric]}
        yUnit={METRIC_UNIT[metric]}
        yMin={metric === 'cpu_pct' ? 0 : undefined as unknown as number}
        yMax={metric === 'cpu_pct' ? 100 : undefined as unknown as number}
        xFormat="auto"
        height={240}
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

function selectStyle(): React.CSSProperties {
  return {
    background: 'var(--sunken)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-heading)',
    cursor: 'pointer',
  };
}
