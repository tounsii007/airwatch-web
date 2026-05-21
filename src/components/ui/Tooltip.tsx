'use client';

/**
 * Lightweight CSS-only tooltip — no portal, no positioning library. The
 * trigger element gets a `role="presentation"` wrapper that owns a
 * positioned tooltip span; hover/focus on the trigger reveals it.
 *
 * Why this and not a Radix/Headless dependency: every tooltip in the
 * app is a one-line status hint. The 0-runtime approach saves ~20 KB
 * gzip and avoids the portal-cleanup edge cases that bite when many
 * tooltips are rendered inside a virtualised list (Stats / Dashboard).
 *
 *   <Tooltip label="Sort by departure time">
 *     <IconButton aria-label="Sort"><Sort size={14} /></IconButton>
 *   </Tooltip>
 */

import type { ReactElement, ReactNode } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';

const SIDE_CLASS: Record<Side, string> = {
  top:    'left-1/2 -translate-x-1/2 bottom-full mb-2',
  bottom: 'left-1/2 -translate-x-1/2 top-full mt-2',
  left:   'right-full mr-2 top-1/2 -translate-y-1/2',
  right:  'left-full ml-2 top-1/2 -translate-y-1/2',
};

const ARROW_CLASS: Record<Side, string> = {
  top:    'top-full left-1/2 -translate-x-1/2 border-t-[var(--glass-bg-strong)] border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--glass-bg-strong)] border-x-transparent border-t-transparent',
  left:   'left-full top-1/2 -translate-y-1/2 border-l-[var(--glass-bg-strong)] border-y-transparent border-r-transparent',
  right:  'right-full top-1/2 -translate-y-1/2 border-r-[var(--glass-bg-strong)] border-y-transparent border-l-transparent',
};

export interface TooltipProps {
  /** The visible string shown on hover/focus. */
  label: ReactNode;
  side?: Side;
  /** Override the implicit description — when set, the trigger's
   *  `aria-describedby` points here (useful for icon-only buttons that
   *  already carry an aria-label). */
  children: ReactElement;
  className?: string;
  /** When true, the tooltip is always visible — useful for testing. */
  forceOpen?: boolean;
}

export function Tooltip({ label, side = 'top', children, className = '', forceOpen = false }: TooltipProps) {
  return (
    <span className={`relative inline-flex group ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md px-2 py-1 t-meta t-mono font-bold uppercase tracking-wider text-[var(--text-primary)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] shadow-[var(--elev-2)] backdrop-blur-md transition-all duration-200 ease-out ${SIDE_CLASS[side]} ${
          forceOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-0.5 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:translate-y-0 group-focus-within:translate-y-0'
        }`}
      >
        {label}
        <span
          aria-hidden
          className={`absolute w-0 h-0 border-4 ${ARROW_CLASS[side]}`}
        />
      </span>
    </span>
  );
}

/** Helper to wrap a node with a tooltip only when `label` is set. */
export function MaybeTooltip({
  label,
  side,
  children,
}: {
  label?: ReactNode;
  side?: Side;
  children: ReactElement;
}) {
  if (!label) return children;
  return (
    <Tooltip label={label} side={side}>
      {children}
    </Tooltip>
  );
}
