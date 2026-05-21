'use client';

/**
 * Card — composable container with optional header / body / footer
 * slots. Built on top of GlassPanel so the design tokens (elevation,
 * border, blur, holographic sheen) flow through unchanged.
 *
 *   <Card title="Live flights" badge={<Tag variant="success">LIVE</Tag>}>
 *     {body}
 *   </Card>
 *
 *   <Card
 *     title="Top airlines"
 *     subtitle="By view count"
 *     action={<IconButton aria-label="Sort"><Sort/></IconButton>}
 *     footer={<Link href="/airlines">See all →</Link>}
 *   >
 *     {rows}
 *   </Card>
 *
 * Where it sits in the system:
 *   * <GlassPanel> — primitive surface; just CSS chrome.
 *   * <Card>       — surface + opinionated layout (header divider,
 *                    padding, optional footer).
 *   * <StatCard>   — specialised numerical tile (separate atom).
 */

import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';

export interface CardProps {
  children: ReactNode;
  /** Heading shown in the card header. When omitted, the header
   *  doesn't render and the body owns the full panel. */
  title?: ReactNode;
  /** Sub-heading rendered beneath `title`. */
  subtitle?: ReactNode;
  /** Right-aligned slot in the header (badge, icon button, link). */
  action?: ReactNode;
  /** Inline element rendered between the title and the action — usually
   *  a count tag (e.g. `<Tag>12</Tag>`). */
  badge?: ReactNode;
  /** Bottom slot — divider + footer content. */
  footer?: ReactNode;
  variant?: 'default' | 'elevated' | 'floating' | 'holographic';
  /** Adds the glass-panel `.interactive` hover-lift. */
  interactive?: boolean;
  /** Drops the inner padding for full-bleed media (e.g. a table or
   *  chart that already handles its own padding). */
  bare?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function Card({
  children,
  title,
  subtitle,
  action,
  badge,
  footer,
  variant = 'default',
  interactive = false,
  bare = false,
  className = '',
  bodyClassName = '',
}: CardProps) {
  const hasHeader = title || subtitle || action || badge;
  const bodyPadding = bare ? '' : 'p-4 lg:p-5';

  return (
    <GlassPanel
      variant={variant}
      interactive={interactive}
      className={`flex flex-col ${className}`}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-4 lg:px-5 pt-4 lg:pt-5 pb-3 border-b border-[var(--glass-border)]">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-primary)] text-sm uppercase flex items-center gap-2">
                <span className="truncate">{title}</span>
                {badge}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 t-meta text-[var(--text-muted)] truncate">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 flex items-center gap-1">{action}</div>
          )}
        </header>
      )}

      <div className={`${bodyPadding} flex-1 min-w-0 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <footer className="px-4 lg:px-5 py-3 border-t border-[var(--glass-border)] text-sm text-[var(--text-secondary)]">
          {footer}
        </footer>
      )}
    </GlassPanel>
  );
}
