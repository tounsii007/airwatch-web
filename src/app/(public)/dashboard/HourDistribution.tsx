'use client';

/**
 * Inline 24-bar histogram showing flights per hour. Designed to fit
 * within a card header at a glance — each bar is a single CSS gradient
 * with no JS-driven layout, no SVG, no charting lib. The peak bucket
 * is tinted with the brand accent so the eye locates "busiest hour"
 * without reading a label.
 *
 * Why pure CSS instead of recharts / d3:
 *   * < 100 bytes of generated markup per chart.
 *   * No re-render cost when the parent re-renders — the DOM matches
 *     the prop count, React reconciles in O(24).
 *   * prefers-reduced-motion: nothing to disable, there's no animation.
 */

interface Props {
  /** 24-element array, flights per hour-of-day. */
  buckets: readonly number[];
  /** Hour with the maximum count, used to tint that bar. May be null. */
  peakHour: number | null;
  /** Aria-friendly label e.g. "Hourly distribution at FRA". */
  ariaLabel: string;
}

// Hours we surface below the chart as anchor ticks. Six-hour spacing is
// the densest you can render without the labels overlapping at typical
// card widths, and it lines up with the international flight-ops mental
// model of "morning / midday / evening / overnight" blocks.
const TICK_HOURS = [0, 6, 12, 18] as const;

export function HourDistribution({ buckets, peakHour, ariaLabel }: Props) {
  const max = buckets.length > 0 ? Math.max(...buckets, 1) : 1;

  return (
    <div className="w-full" role="img" aria-label={ariaLabel}>
      <div className="flex items-end gap-[1px] h-6">
        {buckets.map((count, hour) => {
          // Use a small floor (12 %) so a non-zero bar is always visible
          // — otherwise a single-flight hour disappears next to the peak.
          const heightPct = count === 0 ? 0 : Math.max(12, (count / max) * 100);
          const isPeak = peakHour === hour;
          return (
            <div
              key={hour}
              className="flex-1 rounded-t-[1px] transition-colors"
              style={{
                height: `${heightPct}%`,
                background: isPeak
                  ? 'var(--accent)'
                  : count > 0
                  ? 'color-mix(in srgb, var(--primary-bright) 65%, transparent)'
                  : 'color-mix(in srgb, var(--text-muted) 25%, transparent)',
              }}
              title={`${hour.toString().padStart(2, '0')}:00 — ${count} flight${count === 1 ? '' : 's'}`}
            />
          );
        })}
      </div>
      {/* Axis ticks — laid out on a 24-column grid so each label sits
          centred above its hour column without absolute-positioning
          arithmetic. `aria-hidden` because the bar-by-bar `title`
          attributes already expose per-hour data to AT users. */}
      <div
        className="mt-1 grid grid-cols-[repeat(24,minmax(0,1fr))] t-meta t-mono text-[var(--text-muted)]"
        aria-hidden
      >
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center tabular leading-none">
            {(TICK_HOURS as readonly number[]).includes(h) ? h.toString().padStart(2, '0') : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
