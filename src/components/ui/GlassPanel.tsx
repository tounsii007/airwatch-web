/**
 * Glass-styled surface — the workhorse container in the design system.
 * Renders one of three CSS classes (`.glass-panel`, `.glass-panel-elevated`,
 * `.glass-panel-floating`) plus two opt-in behaviours:
 *
 *   * `interactive` — adds a soft hover-lift (translateY + brighter
 *     border). Use on cards that are themselves clickable.
 *   * `shimmer`     — adds a left-to-right gloss sweep on hover. Use
 *     sparingly; one or two cards per page max.
 *
 * The component keeps backward compatibility with the original
 * single-class implementation: omitting all the new props renders
 * exactly the same DOM as before.
 *
 *   <GlassPanel>content</GlassPanel>
 *   <GlassPanel variant="elevated" interactive>...</GlassPanel>
 *   <GlassPanel variant="floating" shimmer>...</GlassPanel>
 */

import type { ReactNode } from 'react';

type Variant = 'default' | 'elevated' | 'floating';

const VARIANT_CLASS: Record<Variant, string> = {
  default: 'glass-panel',
  elevated: 'glass-panel-elevated',
  floating: 'glass-panel-floating',
};

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: Variant;
  /** Adds hover-lift styles (CSS `.interactive`). */
  interactive?: boolean;
  /** Adds the shimmer gloss-sweep on hover (CSS `.shimmer`). */
  shimmer?: boolean;
  /** Optional aria-role override — defaults to undefined (div). When
   *  the panel is clickable, the consumer should pass `role="button"`
   *  + `tabIndex={0}` themselves (we don't infer it because not every
   *  onClick-bound panel is semantically a button). */
  role?: string;
}

export function GlassPanel({
  children,
  className = '',
  onClick,
  variant = 'default',
  interactive = false,
  shimmer = false,
  role,
}: GlassPanelProps) {
  const base = VARIANT_CLASS[variant];
  const flags = [
    interactive && 'interactive',
    shimmer && 'shimmer',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`${base} ${flags} ${className}`.trim()}
      onClick={onClick}
      role={role}
    >
      {children}
    </div>
  );
}
