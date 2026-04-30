'use client';

/**
 * Standard route-level wrapper. Provides:
 *   * Consistent page padding / max-width / overflow handling
 *   * Subtle fade-up entry animation on mount
 *   * Optional sticky header with title + subtitle slot
 *
 * Design intent: every list-style page (search, airlines, airports,
 * stats, dashboard) shares this shell so the user feels coherent
 * spacing and motion across the app. Map / globe pages bypass this
 * because they need full-bleed canvas.
 *
 *   <PageContainer title="Search" subtitle="Find any flight">
 *     <Stagger>
 *       {results.map(r => <FadeIn key={r.id}><Card .../></FadeIn>)}
 *     </Stagger>
 *   </PageContainer>
 *
 * Tailwind safety note: do NOT switch the `MAX_WIDTH_CLASS` map below
 * to a template-string lookup like `max-w-${maxWidth}`. Tailwind 4's
 * JIT scans source files for **literal** class names — dynamic strings
 * are silently dropped from the output CSS, and the page renders at
 * the browser default width with no error. The literal map keeps every
 * class statically present in source so the JIT picks them up.
 */

import type { ReactNode } from 'react';

type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: '',
};

export function PageContainer({
  title,
  subtitle,
  actions,
  children,
  maxWidth = '7xl',
  className = '',
}: {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
}) {
  const maxClass = MAX_WIDTH_CLASS[maxWidth];
  return (
    <div className={`relative w-full ${maxClass} mx-auto px-4 lg:px-6 pt-4 pb-8 ${className}`}>
      {(title || subtitle || actions) && (
        <header className="animate-fade-in mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && (
              <h1 className="font-[var(--font-heading)] text-2xl lg:text-3xl font-bold tracking-wider text-[var(--primary-bright)] gradient-text">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 font-[var(--font-body)]">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="animate-fade-up">{children}</div>
    </div>
  );
}
