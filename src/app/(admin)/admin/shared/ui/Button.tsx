/**
 * Button primitive — five tones × three sizes, all driven by Tailwind
 * utilities mapped to our admin design tokens.
 *
 * Mirrors shadcn/ui's Button shape (variant + size props) so the API
 * is familiar. Doesn't depend on Radix — keeps the bundle lean.
 */

import * as React from 'react';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
type Size    = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Optional leading icon (any ReactNode — emoji string works fine). */
  leadingIcon?: React.ReactNode;
  /** React 19: ref as plain prop (forwardRef deprecated). */
  ref?: React.Ref<HTMLButtonElement>;
}

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

const VARIANT: Record<Variant, string> = {
  primary: 'text-primary-bright bg-[color-mix(in_srgb,var(--color-primary-bright)_12%,transparent)] border-[color-mix(in_srgb,var(--color-primary-bright)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-primary-bright)_22%,transparent)]',
  success: 'text-success bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] border-[color-mix(in_srgb,var(--color-success)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-success)_22%,transparent)]',
  warning: 'text-warning bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] border-[color-mix(in_srgb,var(--color-warning)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-warning)_22%,transparent)]',
  danger:  'text-error bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] border-[color-mix(in_srgb,var(--color-error)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-error)_22%,transparent)]',
  ghost:   'text-text-secondary bg-transparent border-transparent hover:bg-[rgba(122,154,191,0.10)]',
  outline: 'text-text-secondary bg-transparent border-border hover:bg-[rgba(122,154,191,0.10)] hover:text-text-primary',
};

const SIZE: Record<Size, string> = {
  sm: 'text-[0.65rem] px-2.5 py-1',
  md: 'text-[0.7rem]  px-3   py-1.5',
  lg: 'text-[0.8rem]  px-4   py-2',
};

export function Button({
  variant = 'primary',
  size    = 'md',
  className,
  leadingIcon,
  children,
  disabled,
  ref,
  ...props
}: Props) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded font-[var(--font-heading)] tracking-[0.1em] uppercase border',
        'transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-primary-bright focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {leadingIcon && <span aria-hidden className="text-[0.85em] leading-none">{leadingIcon}</span>}
      {children}
    </button>
  );
}
