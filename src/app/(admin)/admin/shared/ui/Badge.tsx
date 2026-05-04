/**
 * Status badge / pill — five tones, accessible (aria-label fallback to
 * the children text).
 */
import * as React from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Adds a glowing dot prefix; useful for "live" status pills. */
  dot?: boolean;
  /** React 19: ref as plain prop (forwardRef deprecated). */
  ref?: React.Ref<HTMLSpanElement>;
}

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

const TONE: Record<Tone, string> = {
  neutral: 'text-text-secondary bg-[rgba(122,154,191,0.10)] border-border',
  success: 'text-success         bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] border-[color-mix(in_srgb,var(--color-success)_25%,transparent)]',
  warning: 'text-warning         bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] border-[color-mix(in_srgb,var(--color-warning)_25%,transparent)]',
  danger:  'text-error           bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)]   border-[color-mix(in_srgb,var(--color-error)_25%,transparent)]',
  info:    'text-info            bg-[color-mix(in_srgb,var(--color-info)_12%,transparent)]    border-[color-mix(in_srgb,var(--color-info)_25%,transparent)]',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ref,
  ...props
}: Props) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded',
        'font-[var(--font-heading)] text-[0.625rem] font-bold tracking-[0.1em] uppercase',
        'border whitespace-nowrap',
        TONE[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full bg-current"
          style={{ boxShadow: '0 0 6px currentColor' }}
        />
      )}
      {children}
    </span>
  );
}
