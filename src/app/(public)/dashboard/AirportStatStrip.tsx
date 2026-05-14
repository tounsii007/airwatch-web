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
import type { AirportMetrics } from '@/app/(public)/dashboard/airportMetrics';

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
  // When there are no flights at all, every value is "no data" — show them
  // all in the muted colour. Previously AVG DELAY rendered as "0m" in
  // success-green, which read as "perfect — zero delay" instead of
  // "unknown". Keeping the strip visually neutral makes the missing-data
  // state honest.
  const noData = metrics.total === 0;
  const mutedColor = 'var(--text-muted)';

  const cells: { label: string; value: string; color: string; aria: string }[] = [
    {
      label: 'FLIGHTS',
      value: metrics.total.toString(),
      color: noData ? mutedColor : 'var(--primary-bright)',
      aria: `${metrics.total} flights scheduled at ${iata}`,
    },
    {
      label: 'ON-TIME',
      value: noData ? '—' : `${metrics.onTimePercent}%`,
      color: noData ? mutedColor : ratingColor(metrics.onTimePercent),
      aria: noData
        ? `No on-time data for ${iata}`
        : `${metrics.onTimePercent} percent on time at ${iata}`,
    },
    {
      label: 'AVG DELAY',
      value: noData ? '—' : metrics.avgDelayMin > 0 ? `+${metrics.avgDelayMin}m` : '0m',
      color: noData ? mutedColor : delayColor(metrics.avgDelayMin),
      aria: noData
        ? `No average delay at ${iata}`
        : metrics.avgDelayMin > 0
        ? `Average delay ${metrics.avgDelayMin} minutes at ${iata}`
        : `On time at ${iata}`,
    },
    {
      label: 'PEAK',
      value: formatHour(metrics.busiestHour),
      color: noData ? mutedColor : 'var(--accent)',
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
