'use client';

/**
 * Lightweight motion primitives. CSS-driven, no runtime animation
 * library — every effect compiles to GPU-accelerated transform/opacity
 * transitions and respects `prefers-reduced-motion`.
 *
 * Why CSS keyframes instead of framer-motion / motion-one:
 *   * Bundle size: framer-motion is ~35 KB minified gzipped. The four
 *     primitives below cover 90 % of our use-cases for ~0 KB extra
 *     because the keyframes are already in globals.css.
 *   * Tree-shaking: every page that imports a single Motion primitive
 *     pulls in only its own component — no transitive runtime.
 *   * Reduced-motion: handled centrally in globals.css, not per-call.
 */

import { Children, useEffect, useRef, type ReactNode } from 'react';

// ── FadeIn ──────────────────────────────────────────────────────────────
// Element fades from opacity 0 → 1 with a tiny upward shift on mount.
// Use `delay` to stagger manually (most cases use the parent `.stagger`
// utility instead, but `delay` is handy for one-off entries).
export function FadeIn({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'header' | 'span';
}) {
  return (
    <Tag
      className={`animate-fade-up ${className}`}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

// ── ScaleIn ─────────────────────────────────────────────────────────────
// Slight scale-up entry — works well on cards / dialogs / popovers.
export function ScaleIn({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`animate-scale-in ${className}`}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// Beyond this, the cumulative animation delay reaches ~1 s — the human
// eye starts perceiving the last item as "lagging" rather than
// "staggered". Lists this long should use virtualisation (react-window
// / TanStack Virtual) and animate only the rendered slice. The CSS
// rule `.stagger > :nth-child(n+25)` clamps to a single delay so items
// 25+ don't animate instantly, but they all enter together.
const STAGGER_WARN_LIMIT = 24;

// ── Stagger ─────────────────────────────────────────────────────────────
// Wrap a list — children automatically fade-up with progressive delay
// (handled by `.stagger` selectors in globals.css). Each child should
// already have `.animate-fade-up` so the underlying keyframe runs.
//
//   <Stagger className="grid grid-cols-3 gap-4">
//     <FadeIn>...</FadeIn>
//     <FadeIn>...</FadeIn>
//   </Stagger>
//
// In dev, logs a warning when the child count exceeds the per-CSS
// limit — production builds skip the check entirely (process.env
// branches are dead-code-eliminated by Next/Webpack).
export function Stagger({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const warned = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (warned.current) return;
    const count = Children.count(children);
    if (count > STAGGER_WARN_LIMIT) {
      warned.current = true;

      console.warn(
        `[Stagger] ${count} children exceeds the ${STAGGER_WARN_LIMIT}-item ` +
        `stagger budget. Items 25+ will share the same animation-delay (no ` +
        `cascading entry). Use virtualisation for lists this long.`,
      );
    }
  }, [children]);

  return <div className={`stagger ${className}`}>{children}</div>;
}
