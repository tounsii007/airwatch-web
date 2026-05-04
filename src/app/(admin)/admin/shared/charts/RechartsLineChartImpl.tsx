'use client';

import {
  LineChart as RcLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush,
  Label,
} from 'recharts';
import { useMemo } from 'react';

/**
 * Modern interactive line chart wrapping Recharts.
 *
 * Same `Series[]` API as the in-house SVG LineChart so swapping
 * components is a one-line import change. Recharts gives us:
 *   * Hover tooltip with exact values per series at the cursor
 *   * Auto-positioned legend with click-to-toggle visibility
 *   * Animated transitions on data update (helps make AutoRefresh
 *     feel responsive)
 *   * Built-in responsive sizing via ResponsiveContainer
 *   * Crisp lines at any container size (no preserveAspectRatio
 *     stretching that bloats the stroke width)
 *
 * Tradeoffs vs the SVG LineChart:
 *   * +~80 KB gzipped to the bundle (Recharts + d3-shape transitive)
 *   * Client-only ('use client' required by Recharts)
 *   * Different visual language — flatter, less "futuristic"
 */

export interface SeriesPoint {
  /** Epoch ms. */
  t: number;
  /** Numeric value to plot. null = gap (Recharts breaks line at nulls). */
  v: number | null;
}

export interface Series {
  id: string;
  label: string;
  color: string;
  points: readonly SeriesPoint[];
}

/**
 * Vertical event marker rendered across the chart. (Phase 3.2)
 *
 * Used to overlay context that explains a metric movement: deploy times,
 * incident start/end, maintenance windows, manual operator notes.
 *
 * The {@code kind} drives the default colour; an explicit {@code color}
 * always wins. Hovering the marker shows {@code label} as a tooltip.
 */
export interface ChartAnnotation {
  /** Epoch ms — must fall within the chart's x-axis domain to render. */
  t: number;
  label: string;
  kind?: 'deploy' | 'incident' | 'maintenance' | 'note';
  color?: string;
}

const ANNOTATION_COLOR: Record<NonNullable<ChartAnnotation['kind']>, string> = {
  deploy:      'var(--info)',
  incident:    'var(--error)',
  maintenance: 'var(--warning)',
  note:        'var(--text-muted)',
};

interface Props {
  series: readonly Series[];
  height?: number;
  yLabel?: string;
  yUnit?: string;
  yMin?: number | null;
  yMax?: number | null;
  /** When true, render dots on each data point. Default: false (lines only). */
  showDots?: boolean;
  /**
   * Smooth-spline ('monotone') vs straight ('linear') connections.
   * Monotone avoids the cardinal-spline overshoot that the in-house
   * chart suffered from. Default: 'monotone'.
   */
  curve?: 'linear' | 'monotone' | 'step';
  /**
   * X-axis tick formatter — a STRING preset because functions cannot be
   * passed from a server component to a client component (Next.js 16 +
   * React 19 boundary rule). The preset is resolved to a real formatter
   * inside this client component:
   *   * 'time'     → 14:23
   *   * 'date'     → 03.05.
   *   * 'datetime' → 03.05. 14:23
   *   * 'auto'     → time for ranges <24h, date otherwise
   * Default: 'time'.
   */
  xFormat?: 'time' | 'date' | 'datetime' | 'auto';
  /**
   * Vertical event markers (Phase 3.2). Out-of-range entries are
   * filtered automatically — feed this prop the full set returned from
   * /admin/api/chart-annotations and the chart picks what falls inside
   * its x-axis domain.
   */
  annotations?: readonly ChartAnnotation[];
  /**
   * When true, render the Recharts {@code <Brush>} below the plot for
   * operator-controlled zoom + pan. (Phase 3.3) Defaults to false to
   * keep the smaller-format dashboard tiles uncluttered.
   */
  enableZoom?: boolean;
}

const TIME_FMT     = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' });
const DATE_FMT     = new Intl.DateTimeFormat([], { day: '2-digit', month: '2-digit' });
const DATETIME_FMT = new Intl.DateTimeFormat([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function pickFormatter(preset: NonNullable<Props['xFormat']>, allTimes: number[]): (t: number) => string {
  if (preset === 'time')     return (t) => TIME_FMT.format(new Date(t));
  if (preset === 'date')     return (t) => DATE_FMT.format(new Date(t));
  if (preset === 'datetime') return (t) => DATETIME_FMT.format(new Date(t));
  // auto: switch based on the time range covered.
  if (allTimes.length < 2)   return (t) => TIME_FMT.format(new Date(t));
  const span = Math.max(...allTimes) - Math.min(...allTimes);
  return span > 24 * 60 * 60 * 1000
    ? (t) => DATE_FMT.format(new Date(t))
    : (t) => TIME_FMT.format(new Date(t));
}

/**
 * Pivot the per-series points into Recharts' wide-format rows.
 *
 * Recharts wants `[{ t: 1234, series_a: 0.5, series_b: 0.7 }, …]` —
 * one row per timestamp with a column per series. Our input is the
 * opposite (one entry per series, each with its own timestamps), so
 * we union the timestamps and fill in null where a series didn't
 * sample at that bucket.
 */
function pivotSeries(series: readonly Series[]): Array<Record<string, number | null>> {
  if (series.length === 0) return [];
  const allTimes = new Set<number>();
  for (const s of series) for (const p of s.points) allTimes.add(p.t);
  const sortedTimes = [...allTimes].sort((a, b) => a - b);
  return sortedTimes.map((t) => {
    const row: Record<string, number | null> = { t };
    for (const s of series) {
      const point = s.points.find((p) => p.t === t);
      row[s.id] = point ? point.v : null;
    }
    return row;
  });
}

// Default export so next/dynamic can resolve the module without a
// {.default} accessor in the wrapper. Named re-export kept for any
// caller that imported by name (e.g. existing tests).
function RechartsLineChartImpl({
  series,
  height = 220,
  yLabel,
  yUnit = '',
  yMin = 0,
  yMax = null,
  showDots = false,
  curve = 'monotone',
  xFormat = 'time',
  annotations,
  enableZoom = false,
}: Props) {
  // ─── Hooks: ALL up front, before any early return ────────────────
  // React's "rules of hooks" require the same hook calls in the same
  // order on every render. The previous version put the useMemos AFTER
  // the empty-data early-return, which made the hook count vary and
  // tripped React #310 ("Rendered more hooks than during the previous
  // render") the moment data showed up after starting empty.
  const data     = useMemo(() => pivotSeries(series), [series]);
  const allTimes = useMemo(() => data.map((d) => d.t as number), [data]);
  const fmtX     = useMemo(() => pickFormatter(xFormat, allTimes), [xFormat, allTimes]);
  // Filter annotations to the visible time range so out-of-band entries
  // don't waste a ReferenceLine. The Recharts ReferenceLine still renders
  // even if x is outside the domain, just with no anchor — but the marker
  // ends up at the chart edge which looks like a real event. Skip those.
  const visibleAnnotations = useMemo(() => {
    if (!annotations || annotations.length === 0 || allTimes.length === 0) return [];
    const min = Math.min(...allTimes);
    const max = Math.max(...allTimes);
    return annotations.filter(a => a.t >= min && a.t <= max);
  }, [annotations, allTimes]);

  if (data.length === 0) {
    return (
      <div style={emptyStyle(height)}>
        Awaiting data…
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {yLabel && (
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
          {yLabel}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RcLineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtX}
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-heading)' }}
            stroke="var(--border)"
            tickLine={false}
          />
          <YAxis
            domain={[yMin ?? 'auto', yMax ?? 'auto']}
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-heading)' }}
            tickFormatter={(v) => `${Math.round(v).toLocaleString()}${yUnit}`}
            stroke="var(--border)"
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
            }}
            labelFormatter={(t) => new Date(t as number).toLocaleString()}
            formatter={(value: unknown, name: unknown) => {
              const v = typeof value === 'number' ? value : 0;
              const label = series.find((s) => s.id === name)?.label ?? String(name);
              return [`${v.toLocaleString()}${yUnit}`, label];
            }}
            cursor={{ stroke: 'var(--primary-bright)', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Legend
            wrapperStyle={{ fontFamily: 'var(--font-heading)', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}
            iconType="line"
            formatter={(name: unknown) =>
              series.find((s) => s.id === name)?.label ?? String(name)
            }
          />
          {series.map((s) => (
            <Line
              key={s.id}
              type={curve}
              dataKey={s.id}
              name={s.id}
              stroke={s.color}
              strokeWidth={1.5}
              dot={showDots ? { fill: s.color, r: 2 } : false}
              activeDot={{ fill: s.color, r: 4, stroke: 'var(--bg)', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={400}
              connectNulls={false}
            />
          ))}
          {/* Annotations (Phase 3.2) — vertical reference lines with a
              tiny label at the top. Layered AFTER lines so they stay
              visible above the time-series strokes. */}
          {visibleAnnotations.map((a, idx) => {
            const color = a.color ?? ANNOTATION_COLOR[a.kind ?? 'note'];
            return (
              <ReferenceLine
                key={`ann-${idx}-${a.t}`}
                x={a.t}
                stroke={color}
                strokeDasharray="4 3"
                strokeWidth={1}
                ifOverflow="hidden"
              >
                <Label
                  value={a.label}
                  position="top"
                  offset={6}
                  style={{
                    fill: color,
                    fontSize: 9,
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '0.05em',
                  }}
                />
              </ReferenceLine>
            );
          })}
          {/* Phase 3.3 — operator-controlled zoom + pan. Brush sits
              below the plot; dragging its handles narrows the visible
              range. The data array is still the full set; Brush only
              affects what Recharts renders. */}
          {enableZoom && data.length > 8 && (
            <Brush
              dataKey="t"
              height={22}
              stroke="var(--primary-bright)"
              fill="var(--sunken)"
              tickFormatter={fmtX}
              travellerWidth={8}
            />
          )}
        </RcLineChart>
      </ResponsiveContainer>
    </div>
  );
}

function emptyStyle(height: number) {
  return {
    height,
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: 'var(--text-muted)',
    fontSize: '0.8125rem',
  };
}

export default RechartsLineChartImpl;
