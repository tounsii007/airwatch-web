/**
 * Horizontal or vertical separator. Defaults to a hairline glass border;
 * `label` puts a centred caption inside the rule for section breaks.
 *
 *   <Divider />
 *   <Divider label="More options" />
 *   <Divider orientation="vertical" className="h-6" />
 */

import type { ReactNode } from 'react';

export function Divider({
  orientation = 'horizontal',
  label,
  className = '',
}: {
  orientation?: 'horizontal' | 'vertical';
  label?: ReactNode;
  className?: string;
}) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={`inline-block self-stretch w-px bg-[var(--glass-border)] ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-label={typeof label === 'string' ? label : undefined}
        className={`flex items-center gap-3 ${className}`}
      >
        <span className="flex-1 h-px bg-[var(--glass-border)]" aria-hidden />
        <span className="t-meta t-mono font-bold tracking-wider uppercase text-[var(--text-muted)]">
          {label}
        </span>
        <span className="flex-1 h-px bg-[var(--glass-border)]" aria-hidden />
      </div>
    );
  }

  return (
    <hr
      className={`border-0 h-px bg-[var(--glass-border)] ${className}`}
    />
  );
}
