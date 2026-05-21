'use client';

/**
 * Square icon-only button. Forces an accessible name via the required
 * `aria-label` and renders a consistently-sized hit target across the
 * app (toolbars, panel headers, list rows).
 *
 *   <IconButton aria-label="Refresh" onClick={refresh}>
 *     <RefreshCcw size={14} />
 *   </IconButton>
 *
 *   <IconButton aria-label="Radar" onClick={r} active={on} tone="info">
 *     <CloudRain size={18} />
 *   </IconButton>
 *
 * <h3>Variant vs tone</h3>
 * `variant` is the visual chrome (solid panel, ghost, subtle primary).
 * `tone` colours the active state — separate axis so a "solid" button
 * can light up `info` (radar), `accent` (cargo), or `primary` (legend)
 * without the caller pasting `!important` overrides into `className`.
 *
 * <h3>Touch-target expansion</h3>
 * WCAG 2.5.5 / 2.5.8 want a minimum 44×44 px effective tap area for
 * pointer targets. Our visual chrome stays compact (28 / 36 px) because
 * the design is dense by intent, but each button extends its hit
 * region via a transparent `::after` pseudo-element so the actual
 * touchable area meets WCAG even on `size="sm"`. The expanded area is
 * invisible — it doesn't widen the surrounding layout — but the
 * pointer-event resolver picks it up as part of the button.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'solid' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';
type Tone = 'primary' | 'info' | 'accent' | 'success' | 'warning' | 'error';

const SIZE_DIM: Record<Size, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
};

/**
 * Hit-area expansion. Renders an absolute, transparent `::after`
 * shadowing the button so taps near its edge still register. The values
 * are picked so the effective area hits 44×44 px:
 *   * sm (28×28) → inset:-8px → 44×44 effective
 *   * md (36×36) → inset:-4px → 44×44 effective
 *   * lg (44×44) → already large enough, no expansion needed
 */
const HIT_AREA_CLASS: Record<Size, string> = {
  sm: 'relative after:absolute after:content-[""] after:-inset-2',
  md: 'relative after:absolute after:content-[""] after:-inset-1',
  lg: '',
};

const VARIANT_CLASS: Record<Variant, string> = {
  solid:
    'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--surface-light)] hover:border-[var(--glass-border-strong)]',
  ghost:
    'bg-transparent border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5',
  subtle:
    'bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary-bright)] hover:bg-[var(--primary)]/15 hover:border-[var(--primary)]/35',
};

/**
 * Active-state tinting. Picks the colour the button lights up when
 * `active={true}`. Lets MapToolbar say `tone="info"` for the radar
 * toggle instead of pasting `!bg-[var(--info)]/15` into className.
 */
const TONE_ACTIVE: Record<Tone, string> = {
  primary: 'text-[var(--primary)] bg-[var(--primary)]/12 border-[var(--primary)]/30',
  info:    'text-[var(--info)]    bg-[var(--info)]/15    border-[var(--info)]/30',
  accent:  'text-[var(--accent)]  bg-[var(--accent)]/15  border-[var(--accent)]/30',
  success: 'text-[var(--success)] bg-[var(--success)]/15 border-[var(--success)]/30',
  warning: 'text-[var(--warning)] bg-[var(--warning)]/15 border-[var(--warning)]/30',
  error:   'text-[var(--error)]   bg-[var(--error)]/15   border-[var(--error)]/30',
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — icon-only buttons must announce their purpose. */
  'aria-label': string;
  variant?: Variant;
  size?: Size;
  /** Active-state colour. Ignored when `active` is false. */
  tone?: Tone;
  /** Show an indeterminate spinner and disable. */
  loading?: boolean;
  active?: boolean;
  children?: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = 'ghost',
    size = 'md',
    tone = 'primary',
    loading = false,
    active = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const dim = SIZE_DIM[size];
  const hitArea = HIT_AREA_CLASS[size];
  const styles = VARIANT_CLASS[variant];
  const activeCls = active ? TONE_ACTIVE[tone] : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={active || undefined}
      className={`${dim} ${hitArea} inline-flex items-center justify-center rounded-lg transition-all duration-150 ease-out ${styles} ${activeCls} disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
          aria-hidden
        />
      ) : (
        children
      )}
    </button>
  );
});
