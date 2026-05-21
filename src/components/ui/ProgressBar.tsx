/**
 * Determinate or indeterminate progress bar. Two visual modes:
 *
 *   * `value` numeric (0–100) → determinate fill, accessible
 *     `aria-valuenow` / `aria-valuemin` / `aria-valuemax`.
 *   * `value` undefined        → indeterminate, animates an inner
 *     gradient sliding across the track.
 *
 *   <ProgressBar value={42} />
 *   <ProgressBar variant="success" value={uploadPct} />
 *   <ProgressBar />     // indeterminate
 *
 * Sits at 6 px tall by default — small enough to dock under a header
 * but visible enough to read at a glance.
 */

type Variant = 'primary' | 'success' | 'warning' | 'error' | 'info';

const VARIANT_FG: Record<Variant, string> = {
  primary: 'var(--primary-bright)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error:   'var(--error)',
  info:    'var(--info)',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  className = '',
  height = 6,
  ariaLabel,
}: {
  /** When omitted, the bar renders an indeterminate animation. */
  value?: number;
  max?: number;
  variant?: Variant;
  className?: string;
  height?: number;
  ariaLabel?: string;
}) {
  const fg = VARIANT_FG[variant];
  const indeterminate = value === undefined;

  const clamped = !indeterminate ? Math.max(0, Math.min(max, value)) : 0;
  const pct = !indeterminate ? (clamped / max) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : max}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-busy={indeterminate ? true : undefined}
      className={`relative w-full overflow-hidden rounded-full bg-white/5 border border-[var(--glass-border)] ${className}`}
      style={{ height }}
    >
      {indeterminate ? (
        <span
          aria-hidden
          className="absolute inset-y-0 w-1/3 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${fg} 50%, transparent 100%)`,
            animation: 'marquee 1.6s ease-in-out infinite',
            transform: 'translateX(0)',
          }}
        />
      ) : (
        <span
          aria-hidden
          className="block h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${fg}, color-mix(in srgb, ${fg} 70%, var(--primary) 30%))`,
            boxShadow: `0 0 10px -2px ${fg}`,
          }}
        />
      )}
    </div>
  );
}
