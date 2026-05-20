'use client';

/**
 * Shared button primitive. Replaces the scattered `.btn` / `.btn-primary`
 * / `.btn-ghost` class strings with a typed component so call-sites get
 * autocomplete, focus rings, loading states, and a consistent leading-/
 * trailing-icon slot.
 *
 *   <Button variant="primary" leadingIcon={<Plane size={14} />}>
 *     Track flight
 *   </Button>
 *
 *   <Button variant="ghost" size="sm" loading={isSaving}>
 *     Save
 *   </Button>
 *
 * The CSS for the three variants lives in globals.css (`.btn` / `.btn-primary`
 * / `.btn-ghost`); this component only adds size, icon, loading-state, and
 * focus affordances. Keeps the design tokens in one place.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn',
  ghost: 'btn-ghost',
  danger: 'btn btn-danger',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-3 py-1 text-[0.625rem]',
  md: '',
  lg: 'px-6 py-3 text-[0.875rem]',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  size?: Size;
  /** Show a spinner and disable the button while truthy. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** When true, expands to fill the parent width. */
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const base = VARIANT_CLASS[variant];
  const sizeCls = SIZE_CLASS[size];
  const widthCls = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${sizeCls} ${widthCls} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
          aria-hidden
        />
      ) : (
        leadingIcon && <span className="inline-flex shrink-0" aria-hidden>{leadingIcon}</span>
      )}
      {children}
      {!loading && trailingIcon && (
        <span className="inline-flex shrink-0" aria-hidden>{trailingIcon}</span>
      )}
    </button>
  );
});
