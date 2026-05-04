/**
 * Daily audit-event count over the last 30 days. Single-series
 * line chart so an operator can spot suddenly-spiking activity
 * (mass login attempts, unusual ops volume) at a glance.
 *
 * Server-rendered. Backend already emits a dense series with zeros
 * filled in, so the chart never has gaps.
 */
// Recharts variant — interactive tooltip + legend + smooth animations.
// Note: RechartsLineChart is a client component, importing it into this
// server component is fine — Next.js boundary-handles the hydration.
import { RechartsLineChart as LineChart, type Series } from '@/app/(admin)/admin/shared/charts/RechartsLineChart';

export interface AuditDailyPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

interface Props {
  series: readonly AuditDailyPoint[];
}

export function AuditHistoryChart({ series }: Props) {
  // The chart wants epoch-ms timestamps. Parse once and feed straight in.
  const points = series.map((p) => ({
    t: new Date(`${p.date}T12:00:00Z`).getTime(), // mid-day UTC keeps day buckets stable across TZ
    v: p.count,
  }));

  const chartSeries: Series[] = [
    {
      id:    'audit-daily',
      label: 'Audit events',
      color: 'var(--info)',
      points,
    },
  ];

  return (
    <section className="admin-card">
      <h2>Audit activity · last {series.length} days</h2>
      <LineChart
        series={chartSeries}
        height={200}
        yLabel="events"
        xFormat="date"
      />
    </section>
  );
}
