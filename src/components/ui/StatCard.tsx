'use client';

/**
 * Pre-styled stat tile used on /dashboard, /stats, and the admin
 * overview. Stays presentation-only — the parent supplies the value
 * (which may itself be derived from a store or API). This component
 * just animates the count-up + applies the design language.
 *
 * Each card has:
 *   * a 3-letter / short uppercase label
 *   * a large numeric value (animated via CountUp, gradient-tinted)
 *   * an optional secondary line (delta, unit, status badge)
 *   * an optional trend indicator
 *   * an optional accent icon rendered inside a soft tinted halo
 *
 * The tile renders a faint decorative ring + corner glow keyed to the
 * status colour so a row of cards feels visually rich even when every
 * value is currently 0 (the "empty stats" state on /stats).
 *
 * Layout-only props (no styling internals leak out):
 *   <StatCard label="Active flights" value={count} icon={<Plane />} />
 *   <StatCard label="Errors / hr" value={err} trend="down" status="success" />
 */

import type { ReactNode } from 'react';
import { CountUp } from './CountUp';

type Status = 'default' | 'success' | 'warning' | 'error' | 'info';

interface StatusTokens {
  /** Foreground / value colour. */
  fg: string;
  /** Status variable name used for transparent halos via colour-mix. */
  cssVar: string;
}

const STATUS: Record<Status, StatusTokens> = {
  default: { fg: 'var(--primary-bright)', cssVar: '--primary-bright' },
  success: { fg: 'var(--success)',        cssVar: '--success' },
  warning: { fg: 'var(--warning)',        cssVar: '--warning' },
  error:   { fg: 'var(--error)',          cssVar: '--error' },
  info:    { fg: 'var(--info)',           cssVar: '--info' },
};

export function StatCard({
  label,
  value,
  unit,
  decimals = 0,
  status = 'default',
  trend,
  hint,
  icon,
  className = '',
}: {
  label: string;
  /** Numeric value — animated via CountUp. Pass `undefined` while loading. */
  value: number | undefined;
  unit?: string;
  decimals?: number;
  status?: Status;
  trend?: 'up' | 'down' | 'flat';
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tokens = STATUS[status];
  const loading = value === undefined;
  const isZero = value === 0;

  // colour-mix lets us derive transparent tints from a single CSS var
  // without hard-coding every rgba in the theme. Falls back gracefully on
  // older engines because the unsupported property is just ignored.
  const haloBg = `color-mix(in srgb, var(${tokens.cssVar}) 14%, transparent)`;
  const haloRing = `color-mix(in srgb, var(${tokens.cssVar}) 30%, transparent)`;
  const cornerGlow = `radial-gradient(circle at 100% 0%, color-mix(in srgb, var(${tokens.cssVar}) 18%, transparent), transparent 60%)`;

  return (
    <div
      className={`stat-card stat-card-rich ${className}`}
      style={{
        // Drives the left accent bar + corner glow so each card feels
        // tonally tied to its status without the parent having to pass
        // through colour values.
        ['--stat-accent' as string]: `var(${tokens.cssVar})`,
        ['--stat-glow' as string]: cornerGlow,
      }}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div
            className="stat-card-value stat-card-value-rich"
            aria-live="polite"
            aria-atomic="true"
          >
            {loading ? (
              <span className="skeleton inline-block" style={{ width: '4ch', height: '1.75rem' }} />
            ) : (
              <span
                className="stat-card-value-number"
                style={{
                  // Zero values stay muted so the eye lands on cards that
                  // actually have data. Non-zero values get the brand
                  // gradient treatment for a more striking read.
                  color: isZero ? 'var(--text-muted)' : tokens.fg,
                  opacity: isZero ? 0.55 : 1,
                }}
              >
                <CountUp value={value} decimals={decimals} />
                {unit && (
                  <span className="stat-card-value-unit">{unit}</span>
                )}
              </span>
            )}
          </div>
          <div className="stat-card-label">{label}</div>
          {hint && (
            <div className="text-[10px] font-[var(--font-body)] text-[var(--text-secondary)] mt-1.5 truncate">
              {hint}
            </div>
          )}
        </div>

        {icon && (
          <div
            className="stat-card-icon shrink-0"
            style={{
              background: haloBg,
              boxShadow: `0 0 0 1px ${haloRing}`,
              color: tokens.fg,
            }}
            aria-hidden
          >
            {icon}
          </div>
        )}

        {trend && !icon && (
          <span
            className={`text-xs font-bold tabular shrink-0 ${
              trend === 'up'
                ? 'text-[var(--success)]'
                : trend === 'down'
                ? 'text-[var(--error)]'
                : 'text-[var(--text-muted)]'
            }`}
            aria-label={`Trend ${trend}`}
          >
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'}
          </span>
        )}
      </div>

      {/* Trend pill that lives below the value when an icon already
          occupies the right slot. Kept compact so the card height stays
          consistent across cards that have / don't have a trend. */}
      {trend && icon && (
        <div className="relative z-10 mt-2">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold tabular ${
              trend === 'up'
                ? 'text-[var(--success)]'
                : trend === 'down'
                ? 'text-[var(--error)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'}
          </span>
        </div>
      )}
    </div>
  );
}
