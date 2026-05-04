/**
 * Multi-series line chart in pure SVG. Designed for the admin dashboard's
 * load + user-count panels.
 *
 *   <LineChart
 *     series={[
 *       { id: 'api-1', label: 'api-1', color: 'var(--info)',    points: [...] },
 *       { id: 'api-2', label: 'api-2', color: 'var(--primary)', points: [...] },
 *     ]}
 *     yLabel="CPU %"
 *     xFormat={(t) => new Date(t).toLocaleTimeString()}
 *   />
 *
 * Features:
 *   * Axes with auto-computed nice ticks (5 horizontal grid lines).
 *   * Smooth cardinal-spline path per series (same math as Sparkline).
 *   * Glow / shadow on the most-recent point.
 *   * Inline legend.
 *   * Server-renderable (no 'use client') — animations are pure CSS.
 */

export interface SeriesPoint {
  /** Epoch ms. */
  t: number;
  /** Numeric value to plot. null = gap (handled). */
  v: number | null;
}

export interface Series {
  id: string;
  label: string;
  color: string;
  points: readonly SeriesPoint[];
}

interface Props {
  series: readonly Series[];
  /** Pixel height; width comes from the parent. */
  height?: number;
  /** Y-axis label rendered in the top-left corner. */
  yLabel?: string;
  /** Y-axis suffix (e.g. " ms", " %"). */
  yUnit?: string;
  /** Force min Y; null = auto. */
  yMin?: number | null;
  /** Force max Y; null = auto. */
  yMax?: number | null;
  xFormat?: (t: number) => string;
}

const PADDING = { top: 16, right: 24, bottom: 28, left: 48 };

/**
 * Multiplier applied to the median sample-delta to decide where one run
 * ends and the next begins. 3× is generous enough to tolerate a single
 * skipped scrape without splitting, but tight enough to catch genuine
 * outages (replica restart, polling pause).
 */
const GAP_FACTOR = 3;

/**
 * Split a time-ordered series into contiguous runs whenever the inter-
 * sample delta exceeds GAP_FACTOR× the series median. Returns at least
 * one run; an all-uniform series returns a single run containing every
 * point.
 */
function splitOnGaps<T extends { t: number }>(pts: readonly T[]): T[][] {
  if (pts.length <= 1) return [pts.slice()];
  const sorted = [...pts].sort((a, b) => a.t - b.t);

  // Median delta — robust against a single outlier interval.
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) deltas.push(sorted[i].t - sorted[i - 1].t);
  const sortedDeltas = [...deltas].sort((a, b) => a - b);
  const median = sortedDeltas[Math.floor(sortedDeltas.length / 2)] || 1;
  const threshold = median * GAP_FACTOR;

  const runs: T[][] = [];
  let cur: T[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].t - sorted[i - 1].t > threshold) {
      runs.push(cur);
      cur = [sorted[i]];
    } else {
      cur.push(sorted[i]);
    }
  }
  runs.push(cur);
  return runs;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const ratio = v / base;
  let nice;
  if (ratio < 1.5) nice = 1.5;
  else if (ratio < 2)  nice = 2;
  else if (ratio < 3)  nice = 3;
  else if (ratio < 5)  nice = 5;
  else if (ratio < 7)  nice = 7;
  else                 nice = 10;
  return nice * base;
}

function smoothPath(points: ReadonlyArray<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function LineChart({
  series,
  height = 220,
  yLabel,
  yUnit = '',
  yMin = null,
  yMax = null,
  xFormat,
}: Props) {
  const allValues = series.flatMap((s) => s.points.map((p) => p.v).filter((v): v is number => v != null));
  const allTimes  = series.flatMap((s) => s.points.map((p) => p.t));

  // Empty / "loading" state.
  if (allValues.length === 0 || allTimes.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
        Awaiting data…
      </div>
    );
  }

  const minV = yMin ?? 0;
  const rawMax = Math.max(...allValues, 1);
  const maxV = yMax ?? niceMax(rawMax);
  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);

  const VIEW_W = 1000;
  const innerW = VIEW_W - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top  - PADDING.bottom;

  const xOf = (t: number) =>
    PADDING.left + (maxT === minT ? innerW / 2 : ((t - minT) / (maxT - minT)) * innerW);
  const yOf = (v: number) =>
    PADDING.top + innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  // 5 horizontal gridlines.
  const ticks: number[] = [];
  for (let i = 0; i <= 4; i++) ticks.push(minV + ((maxV - minV) * i) / 4);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={yLabel ?? 'Time series chart'}
      >
        {/* Y-axis grid + labels */}
        {ticks.map((t, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={PADDING.left}
              x2={VIEW_W - PADDING.right}
              y1={yOf(t)}
              y2={yOf(t)}
              stroke="rgba(122, 154, 191, 0.10)"
              strokeWidth={0.5}
            />
            <text
              x={PADDING.left - 6}
              y={yOf(t) + 3}
              fill="var(--text-muted)"
              fontSize="9"
              fontFamily="var(--font-heading)"
              textAnchor="end"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(t).toLocaleString()}{yUnit}
            </text>
          </g>
        ))}

        {/*
          X-axis labels — 5 evenly-spaced ticks (start, +25%, +50%,
          +75%, end). Three was too few for 24H/1W ranges where the
          middle gap could span 12 hours unlabeled. Five gives a
          1H / 6H / 24H / 1W axis enough granularity to scan time
          without overcrowding the sub-220 px tall chart.
        */}
        {Array.from({ length: 5 }, (_, i) => minT + ((maxT - minT) * i) / 4).map((t, i) => (
          <text
            key={`xtick-${i}`}
            x={xOf(t)}
            y={height - PADDING.bottom + 14}
            fill="var(--text-muted)"
            fontSize="9"
            fontFamily="var(--font-heading)"
            textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {xFormat ? xFormat(t) : new Date(t).toLocaleString()}
          </text>
        ))}

        {/*
          Series rendering with gap-aware path splitting.

          Why split: consecutive samples spaced more than ~3× the typical
          interval apart almost certainly mean "no data was collected
          here" (replica restart, polling outage, scrape interval gap).
          Drawing one continuous spline through them makes the gap
          invisible and produces the long horizontal "ribbon" lines you
          see when a 45-minute hole gets bridged with smoothing.

          Strategy:
            1. Drop null-valued samples (raw gaps).
            2. Compute the median delta between remaining samples per
               series — that's our baseline cadence estimate.
            3. Split the series into runs where consecutive deltas are
               ≤ {@link GAP_FACTOR}× the median.
            4. Draw each run as its own smooth path (a 1-point run still
               shows as a circle marker so an isolated sample is visible).
            5. Mark the gap visually with a thin dashed line connecting
               the run boundaries — operators see "data was here, then
               here, but nothing in between" rather than an unbroken
               curve that hides the outage.
        */}
        {series.map((s) => {
          const cleanPts = s.points
            .filter((p): p is { t: number; v: number } => p.v != null);
          if (cleanPts.length === 0) return null;

          const runs = splitOnGaps(cleanPts);
          const lastRun = runs[runs.length - 1];
          const lastPt = lastRun[lastRun.length - 1];
          const lastXY: [number, number] = [xOf(lastPt.t), yOf(lastPt.v)];

          return (
            <g key={s.id}>
              {runs.map((run, runIdx) => {
                const xy = run.map((p) => [xOf(p.t), yOf(p.v)] as [number, number]);
                // Single-point run: render a marker so an isolated sample
                // doesn't disappear.
                if (xy.length === 1) {
                  return (
                    <circle
                      key={`pt-${runIdx}`}
                      cx={xy[0][0]}
                      cy={xy[0][1]}
                      r={2}
                      fill={s.color}
                    />
                  );
                }
                return (
                  <path
                    key={`run-${runIdx}`}
                    d={smoothPath(xy)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {/*
                Gap-bridging hint — for each pair of adjacent runs, draw a
                short dashed line between the end of the previous run and
                the start of the next. Communicates "we know there's a hole
                here" without pretending we have data.
              */}
              {runs.slice(0, -1).map((run, i) => {
                const a = run[run.length - 1];
                const b = runs[i + 1][0];
                return (
                  <line
                    key={`gap-${i}`}
                    x1={xOf(a.t)} y1={yOf(a.v)}
                    x2={xOf(b.t)} y2={yOf(b.v)}
                    stroke={s.color}
                    strokeOpacity={0.25}
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              <circle
                cx={lastXY[0]}
                cy={lastXY[1]}
                r={3}
                fill={s.color}
                style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
              >
                <animate attributeName="r" values="3;4.5;3" dur="2.4s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: 8, fontSize: '0.6875rem', fontFamily: 'var(--font-heading)' }}>
        {series.map((s) => (
          <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 10,
                height: 2,
                background: s.color,
                boxShadow: `0 0 6px ${s.color}`,
                borderRadius: 1,
              }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
