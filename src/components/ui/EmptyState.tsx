'use client';

/**
 * Generic empty-state placeholder used wherever a list/grid is empty.
 * Centres an icon halo, a title, an optional supporting paragraph, and
 * optional action(s). Pages have so far hand-rolled their own variants
 * (Stats, Search, Geofences) — this primitive lets them converge on one
 * shape so the user experience feels uniform.
 *
 *   <EmptyState
 *     icon={<Plane size={28} />}
 *     title={t('no_flights_yet', language)}
 *     body={t('start_tracking_to_see', language)}
 *     action={<Button variant="primary">Track a flight</Button>}
 *   />
 */

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Icon shown inside a tinted halo at the top of the card. */
  icon?: ReactNode;
  title: ReactNode;
  /** Supporting paragraph — typically one or two sentences. */
  body?: ReactNode;
  /** Single or grouped action(s) — buttons, links, badge with stats. */
  action?: ReactNode;
  /** Override the visual variant. Default 'default'. */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** When true, omit the glass-panel chrome so the empty-state slots
   *  inside a parent that's already a panel. */
  bare?: boolean;
  className?: string;
}

const VARIANT_VAR: Record<NonNullable<EmptyStateProps['variant']>, string> = {
  default: '--primary-bright',
  success: '--success',
  warning: '--warning',
  error:   '--error',
  info:    '--info',
};

export function EmptyState({
  icon,
  title,
  body,
  action,
  variant = 'default',
  bare = false,
  className = '',
}: EmptyStateProps) {
  const cssVar = VARIANT_VAR[variant];
  const haloBg = `color-mix(in srgb, var(${cssVar}) 14%, transparent)`;
  const haloRing = `color-mix(in srgb, var(${cssVar}) 30%, transparent)`;
  const iconColor = `var(${cssVar})`;

  const chrome = bare ? '' : 'glass-panel rounded-2xl p-8';

  return (
    <div
      role="status"
      className={`${chrome} flex flex-col items-center text-center gap-4 ${className}`.trim()}
    >
      {icon && (
        <span
          className="inline-flex items-center justify-center w-14 h-14 rounded-full"
          style={{
            background: haloBg,
            boxShadow: `0 0 0 1px ${haloRing}, 0 0 24px -6px ${iconColor}`,
            color: iconColor,
          }}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <div>
        <h3 className="font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-primary)] t-display">
          {title}
        </h3>
        {body && (
          <p className="mt-2 text-[var(--text-secondary)] font-[var(--font-body)] text-sm max-w-prose">
            {body}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
