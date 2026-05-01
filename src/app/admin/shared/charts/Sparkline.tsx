/**
 * Pure-SVG sparkline. Renders a single time-series as a smooth area + line
 * inside whatever container the parent provides. Zero runtime deps —
 * everything is path math + CSS.
 *
 * The component is a server component (no 'use client') so it ships zero
 * JS to the browser when used on the SSR-rendered admin pages.
 *
 *   <Sparkline values={[12, 14, 11, 18, 22, 20, 25]} stroke="var(--success)" />
 *
 * Renders a 100×30 viewBox by default; consumer scales via CSS width/height.
 * The path uses smooth cardinal-spline interpolation (Catmull-Rom-ish) for
 * a more "modern" look than the typical jagged polyline.
 */

interface Props {
  values: readonly number[];
  /** Stroke colour. Defaults to currentColor so the parent can theme it. */
  stroke?: string;
  /** Fill below the line — usually a transparent version of stroke. */
  fill?: string;
  /** Width of the SVG viewBox; height stays fixed at 30 for a 1:3 ratio. */
  width?: number;
  height?: number;
  /** Stroke thickness in viewBox units. */
  strokeWidth?: number;
  /** Whether to show a glowing dot on the last point. */
  showLastPoint?: boolean;
}

function smoothPath(points: ReadonlyArray<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y}`;
  }
  // Cardinal spline → cubic Bezier per segment, tension = 0.5.
  const pts = points;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function Sparkline({
  values,
  stroke = 'currentColor',
  fill = 'currentColor',
  width = 100,
  height = 30,
  strokeWidth = 1.5,
  showLastPoint = true,
}: Props) {
  if (values.length === 0) {
    return <svg viewBox={`0 0 ${width} ${height}`} aria-hidden width="100%" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  // Bottom padding (4 px) leaves room for the line not to clip the
  // edge; top padding (3 px) leaves room for the glow on max points.
  const top = 3;
  const bottom = height - 4;
  const usable = bottom - top;

  const points: Array<[number, number]> = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = bottom - ((v - min) / range) * usable;
    return [x, y];
  });

  const path = smoothPath(points);
  const areaPath = `${path} L ${width} ${bottom} L 0 ${bottom} Z`;
  const last = points[points.length - 1];

  // A unique ID for the gradient so multiple sparklines on one page
  // don't collide. Random seeded by length + values[0] is enough for
  // SSR determinism within a render.
  const gradId = `spark-grad-${values.length}-${Math.round(values[0] * 1000)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {showLastPoint && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={2.5}
          fill={stroke}
          style={{ filter: `drop-shadow(0 0 4px ${stroke})` }}
        />
      )}
    </svg>
  );
}
