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

        {/* X-axis labels — first, middle, last */}
        {[minT, (minT + maxT) / 2, maxT].map((t, i) => (
          <text
            key={`xtick-${i}`}
            x={xOf(t)}
            y={height - PADDING.bottom + 14}
            fill="var(--text-muted)"
            fontSize="9"
            fontFamily="var(--font-heading)"
            textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {xFormat ? xFormat(t) : new Date(t).toLocaleString()}
          </text>
        ))}

        {/* Series */}
        {series.map((s) => {
          const pts = s.points
            .filter((p) => p.v != null)
            .map((p) => [xOf(p.t), yOf(p.v as number)] as [number, number]);
          if (pts.length === 0) return null;
          const path = smoothPath(pts);
          const last = pts[pts.length - 1];
          return (
            <g key={s.id}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <circle
                cx={last[0]}
                cy={last[1]}
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
