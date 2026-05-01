'use client';

/**
 * Compact 4-cell statistics strip placed below the airport-card header.
 * Replaces the previous "card has only schedule lists" layout — at a
 * glance the user sees TOTAL · ON-TIME · AVG-DELAY · PEAK-HOUR before
 * scanning the actual flight rows. This is the move from "list" to
 * "dashboard".
 *
 * Coloring rules:
 *   * On-time % uses success-green ≥ 80, warning-amber 60–79, error-red < 60.
 *   * Avg-delay uses success when 0, warning 1–15, error > 15.
 * The colour-mix tinted backgrounds keep the strip from competing with
 * the schedule rows below — the value is bold + colour-coded, the cell
 * stays calm.
 */
import type { AirportMetrics } from '@/app/dashboard/airportMetrics';

interface Props {
  metrics: AirportMetrics;
  iata: string;
}

function ratingColor(percent: number): string {
  if (percent >= 80) return 'var(--success)';
  if (percent >= 60) return 'var(--warning)';
  return 'var(--error)';
}

function delayColor(min: number): string {
  if (min === 0) return 'var(--success)';
  if (min <= 15) return 'var(--warning)';
  return 'var(--error)';
}

function formatHour(hour: number | null): string {
  if (hour === null) return '—';
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function AirportStatStrip({ metrics, iata }: Props) {
  const cells: { label: string; value: string; color: string; aria: string }[] = [
    {
      label: 'FLIGHTS',
      value: metrics.total.toString(),
      color: 'var(--primary-bright)',
      aria: `${metrics.total} flights scheduled at ${iata}`,
    },
    {
      label: 'ON-TIME',
      value: metrics.total > 0 ? `${metrics.onTimePercent}%` : '—',
      color: metrics.total > 0 ? ratingColor(metrics.onTimePercent) : 'var(--text-muted)',
      aria: metrics.total > 0
        ? `${metrics.onTimePercent} percent on time at ${iata}`
        : `No on-time data for ${iata}`,
    },
    {
      label: 'AVG DELAY',
      value: metrics.avgDelayMin > 0 ? `+${metrics.avgDelayMin}m` : '0m',
      color: delayColor(metrics.avgDelayMin),
      aria: metrics.avgDelayMin > 0
        ? `Average delay ${metrics.avgDelayMin} minutes at ${iata}`
        : `No average delay at ${iata}`,
    },
    {
      label: 'PEAK',
      value: formatHour(metrics.busiestHour),
      color: 'var(--accent)',
      aria: metrics.busiestHour !== null
        ? `Busiest hour ${formatHour(metrics.busiestHour)} at ${iata}`
        : `No peak hour data for ${iata}`,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-md px-2 py-1.5 text-center"
          style={{
            background: `color-mix(in srgb, ${c.color} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${c.color} 18%, transparent)`,
          }}
          aria-label={c.aria}
        >
          <div
            className="t-value t-mono tabular"
            style={{ color: c.color }}
          >
            {c.value}
          </div>
          <div className="t-meta t-mono text-[var(--text-muted)] mt-0.5">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
