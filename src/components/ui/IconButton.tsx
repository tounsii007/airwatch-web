'use client';

/**
 * Square icon-only button. Forces an accessible name via the required
 * `aria-label` and renders a consistently-sized hit target across the
 * app (toolbars, panel headers, list rows).
 *
 *   <IconButton aria-label="Refresh" onClick={refresh}>
 *     <RefreshCcw size={14} />
 *   </IconButton>
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'solid' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const SIZE_DIM: Record<Size, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
};

const VARIANT_CLASS: Record<Variant, string> = {
  solid:
    'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--surface-light)] hover:border-[var(--glass-border-strong)]',
  ghost:
    'bg-transparent border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5',
  subtle:
    'bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary-bright)] hover:bg-[var(--primary)]/15 hover:border-[var(--primary)]/35',
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — icon-only buttons must announce their purpose. */
  'aria-label': string;
  variant?: Variant;
  size?: Size;
  /** Show an indeterminate spinner and disable. */
  loading?: boolean;
  active?: boolean;
  children?: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = 'ghost',
    size = 'md',
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
  const styles = VARIANT_CLASS[variant];
  const activeCls = active
    ? 'text-[var(--primary)] bg-[var(--primary)]/12 border-[var(--primary)]/30'
    : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={active || undefined}
      className={`${dim} inline-flex items-center justify-center rounded-lg transition-all duration-150 ease-out ${styles} ${activeCls} disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${className}`.trim()}
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
