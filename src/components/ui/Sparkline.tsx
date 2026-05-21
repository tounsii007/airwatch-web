'use client';

/**
 * Tiny inline trend chart. Renders a smooth SVG path (and optionally a
 * fill area) sized to fill its parent. Designed to live inside StatCard
 * footers, list rows, and tooltips — anywhere a number wants a visual
 * companion without pulling in a charting library.
 *
 *   <Sparkline data={[2, 4, 3, 6, 8, 7, 9]} />
 *   <Sparkline data={errorsPerHour} variant="error" showFill={false} />
 *
 * Implementation notes:
 *   * Path uses Catmull-Rom-style cubic smoothing — every consecutive
 *     pair of points contributes a control point derived from the
 *     neighbour gradient. Cheaper than a true bezier fit and looks
 *     smooth enough for ≤ 64 points.
 *   * No animation by default. Pair with `animate-fade-in` on a parent
 *     if you want an entry transition; built-in path animation reflows
 *     while the parent layout settles.
 *   * Honours `prefers-reduced-motion` indirectly because there's no
 *     animation here at all.
 */

import { useMemo } from 'react';

type Variant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'muted';

const VARIANT_STROKE: Record<Variant, string> = {
  primary: 'var(--primary-bright)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error:   'var(--error)',
  info:    'var(--info)',
  muted:   'var(--text-muted)',
};

export interface SparklineProps {
  /** The data points. Empty or single-point arrays render nothing. */
  data: readonly number[];
  variant?: Variant;
  /** Stroke width in viewBox units. Default 2. */
  strokeWidth?: number;
  /** When true (default), fills the area below the curve with a tinted
   *  gradient. Set false for a pure line. */
  showFill?: boolean;
  /** When true (default), marks the last point with a small dot. */
  showEndDot?: boolean;
  /** Optional aria-label for screen readers. */
  ariaLabel?: string;
  className?: string;
  /** Override the rendered height in pixels. Width fills the parent. */
  height?: number;
}

/**
 * Build a smooth cubic path through the given points. We compute
 * tangents as the average slope of the surrounding segments and use a
 * fixed-fraction control-point projection (1/6 of the inbound segment).
 */
function buildSmoothPath(
  points: readonly { x: number; y: number }[],
  smoothing = 0.18,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y}`;
  }

  const segments: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const prev = points[i - 1] ?? points[i];
    const curr = points[i];
    const next = points[i + 1];
    const after = points[i + 2] ?? next;

    // Control point on the outbound side of `curr`.
    const cp1x = curr.x + (next.x - prev.x) * smoothing;
    const cp1y = curr.y + (next.y - prev.y) * smoothing;
    // Control point on the inbound side of `next`.
    const cp2x = next.x - (after.x - curr.x) * smoothing;
    const cp2y = next.y - (after.y - curr.y) * smoothing;

    segments.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`);
  }

  return segments.join(' ');
}

const VIEW_W = 100;
const VIEW_H = 30;
const PADDING_Y = 2;

export function Sparkline({
  data,
  variant = 'primary',
  strokeWidth = 2,
  showFill = true,
  showEndDot = true,
  ariaLabel,
  className = '',
  height = 28,
}: SparklineProps) {
  const { path, fillPath, lastPoint } = useMemo(() => {
    const n = data.length;
    if (n < 2) return { path: '', fillPath: '', lastPoint: null };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = VIEW_W / (n - 1);
    const usableH = VIEW_H - PADDING_Y * 2;

    const pts = data.map((v, i) => ({
      x: i * step,
      y: VIEW_H - PADDING_Y - ((v - min) / range) * usableH,
    }));

    const line = buildSmoothPath(pts);
    const fill = `${line} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;
    return { path: line, fillPath: fill, lastPoint: pts[pts.length - 1] };
  }, [data]);

  if (!path) return null;

  const stroke = VARIANT_STROKE[variant];
  const gradientId = `spark-${variant}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      className={`block w-full ${className}`}
      style={{ height }}
    >
      {showFill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.38" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {showFill && <path d={fillPath} fill={`url(#${gradientId})`} />}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showEndDot && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={strokeWidth * 1.2}
          fill={stroke}
          stroke="var(--bg)"
          strokeWidth={strokeWidth * 0.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
