/**
 * Inline pill / chip. Sister of the existing `.badge` CSS class but
 * with a typed variant system and an optional dismiss handle. Use for
 * filter chips, route tags, status pills inside list rows.
 *
 *   <Tag>737-800</Tag>
 *   <Tag variant="success" dot>Live</Tag>
 *   <Tag variant="info" onDismiss={() => removeFilter('iata')}>FRA</Tag>
 */

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';
type Size = 'sm' | 'md';

const VARIANT_CLASS: Record<Variant, string> = {
  default: 'badge',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  error: 'badge badge-error',
  info: 'badge badge-info',
  muted:
    'badge bg-white/5 text-[var(--text-muted)] border-[var(--glass-border)] dark:bg-white/5',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'text-[0.5625rem] px-1.5 py-0.5',
  md: '',
};

export interface TagProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Show a leading dot indicator (matches `.badge-dot`). */
  dot?: boolean;
  /** When set, renders an X handle and invokes the callback on click. */
  onDismiss?: () => void;
  /** Optional aria-label for the dismiss button — defaults to "Remove". */
  dismissLabel?: string;
  className?: string;
  /** Override the role — default is implicit (`span`). */
  title?: string;
}

export function Tag({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  onDismiss,
  dismissLabel = 'Remove',
  className = '',
  title,
}: TagProps) {
  const cls = `${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${dot ? 'badge-dot' : ''} ${className}`.trim();

  return (
    <span className={cls} title={title}>
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="ml-0.5 -mr-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-white/15 transition-colors"
        >
          <X size={10} aria-hidden />
        </button>
      )}
    </span>
  );
}
