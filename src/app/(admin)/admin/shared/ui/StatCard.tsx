/**
 * Tremor-style KPI stat card.
 *
 * Visual:
 *   ┌────────────────────────────────────┐
 *   │ LABEL                              │   delta ▲ +12%
 *   │ 1,234.56 ms                        │
 *   │ hint text                          │
 *   │ ▁▂▃▅▇▆▄▃ (sparkline)               │
 *   └────────────────────────────────────┘
 *
 * Differences from our existing KpiCard:
 *   * Tailwind utility classes instead of inline styles → smaller
 *     compiled CSS, easier to tweak per-instance.
 *   * Optional delta chip with auto-arrow + colour from the sign.
 *   * Sparkline opt-in (height defaults to 32 px when present).
 *   * Number font is system sans-serif so the slashed-zero issue
 *     can't recur (carried over from the KpiCard fix).
 */
import * as React from 'react';
import { Sparkline } from '@/app/(admin)/admin/shared/charts/Sparkline';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface Props {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  tone?: Tone;
  /** Time series for the inline sparkline. */
  sparkline?: readonly number[];
  /** Numeric delta (e.g. +12 / -3.2) — auto-decorates with arrow + colour. */
  delta?: number;
  /** Override unit on the delta chip — defaults to `unit`. */
  deltaUnit?: string;
}

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-primary-bright',
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-error',
  info:    'text-info',
};

const TONE_GLOW: Record<Tone, string> = {
  default: '[text-shadow:0_0_24px_color-mix(in_srgb,var(--color-primary-bright)_35%,transparent)]',
  success: '[text-shadow:0_0_24px_color-mix(in_srgb,var(--color-success)_35%,transparent)]',
  warning: '[text-shadow:0_0_24px_color-mix(in_srgb,var(--color-warning)_35%,transparent)]',
  danger:  '[text-shadow:0_0_24px_color-mix(in_srgb,var(--color-error)_35%,transparent)]',
  info:    '[text-shadow:0_0_24px_color-mix(in_srgb,var(--color-info)_35%,transparent)]',
};

export function StatCard({
  label, value, unit, hint, tone = 'default', sparkline, delta, deltaUnit,
}: Props) {
  const deltaTone: Tone = delta === undefined
    ? 'default'
    : delta > 0 ? 'success' : delta < 0 ? 'danger' : 'default';
  const deltaArrow = delta === undefined ? '' : delta > 0 ? '▲' : delta < 0 ? '▼' : '◆';

  return (
    <div
      className="
        relative bg-surface border border-border rounded-lg p-5 pt-5 pb-4 overflow-hidden
        transition-colors
      "
    >
      {/* Subtle corner glow tinted by tone — same look as the legacy KpiCard. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-${tone === 'default' ? 'primary-bright' : tone === 'danger' ? 'error' : tone}) 10%, transparent) 0%, transparent 60%)`,
        }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="font-[var(--font-heading)] text-[0.625rem] font-bold tracking-[0.18em] uppercase text-text-muted">
          {label}
        </div>
        {delta !== undefined && (
          <span
            className={`
              ${TONE_TEXT[deltaTone]}
              font-[var(--font-heading)] text-[0.65rem] font-bold tracking-wider
              px-1.5 py-0.5 rounded border
              border-current/30 bg-current/10
              tabular-nums
            `}
          >
            {deltaArrow} {Math.abs(delta).toLocaleString()}{deltaUnit ?? unit ?? ''}
          </span>
        )}
      </div>
      <div
        className={`
          mt-1.5 font-sans font-bold leading-none tabular-nums
          [font-variant-numeric:tabular-nums_lining-nums]
          tracking-tight
          text-[2.25rem]
          ${TONE_TEXT[tone]} ${TONE_GLOW[tone]}
        `}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && (
          <span className="ml-1 text-[0.875rem] font-medium font-[var(--font-heading)] tracking-wider text-text-muted">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-2 text-[0.75rem] text-text-secondary">
          {hint}
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <div className={`mt-3 h-10 ${TONE_TEXT[tone]}`}>
          <Sparkline values={sparkline} stroke="currentColor" fill="currentColor" height={40} strokeWidth={1.25} />
        </div>
      )}
    </div>
  );
}
