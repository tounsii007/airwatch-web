/**
 * Donut/ring chart — used on the admin dashboard for the overall port-status
 * distribution (X up / Y down). Pure SVG, no chart lib.
 *
 *   <Donut total={11} value={9} label="UP" color="var(--success)" />
 *
 * The center label slot is left flexible so the parent can render a big
 * count + a small caption. Renders a soft drop-shadow on the active arc for
 * the modern "glow" feel.
 */
import type { ReactNode } from 'react';

interface Props {
  /** 0–total. Renders as the coloured arc. */
  value: number;
  total: number;
  /** Big ring colour. */
  color?: string;
  /** Track (background ring) colour. */
  trackColor?: string;
  /** Center label — render anything (e.g. <CountUp /> + <small>). */
  children?: ReactNode;
  /** Diameter in CSS px. Defaults 140. */
  size?: number;
  /** Stroke thickness as fraction of radius. */
  thickness?: number;
}

export function Donut({
  value,
  total,
  color = 'var(--success)',
  trackColor = 'rgba(122, 154, 191, 0.12)',
  children,
  size = 140,
  thickness = 0.18,
}: Props) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.max(0, Math.min(1, value / safeTotal));

  const r = 50;
  const stroke = r * thickness * 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
            transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
