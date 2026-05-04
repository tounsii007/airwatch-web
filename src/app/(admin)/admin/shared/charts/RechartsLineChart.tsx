/**
 * Lazy-loaded wrapper around the real Recharts implementation. (Phase 3.5)
 *
 * <h3>Why split</h3>
 * Recharts + d3-shape weigh ~80 KB gzipped. A dozen admin pages don't
 * need it (Settings, Cache, Maintenance, Probes, etc.) — only the few
 * that render line charts (Dashboard, Users, Quota history, Endpoints).
 * Without splitting, every operator pays the chart cost on every page
 * load.
 *
 * <h3>What this file does</h3>
 * Uses {@link import('next/dynamic').default} to defer the
 * {@link RechartsLineChartImpl} bundle until the first time a chart
 * actually renders. Subsequent navigations to other chart-bearing
 * pages reuse the already-loaded chunk — operators only pay the cost
 * once per session.
 *
 * <h3>Type re-exports</h3>
 * Types are erased at compile time so re-exporting them from the impl
 * file does NOT pull the runtime code into the bundle. Callers keep
 * the same import-by-name pattern.
 *
 * <h3>'use client'</h3>
 * Required by Next.js's lazy-loading rules: {@code next/dynamic} with
 * client components only works from inside a client component.
 */
'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type RechartsLineChartImpl from './RechartsLineChartImpl';

// Re-export all types — type-only imports don't bring runtime in.
export type { Series, SeriesPoint, ChartAnnotation } from './RechartsLineChartImpl';

const LazyImpl = dynamic(() => import('./RechartsLineChartImpl'), {
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 220,
      color: 'var(--text-muted)',
      fontSize: '0.8125rem',
      fontFamily: 'var(--font-heading)',
      letterSpacing: '0.05em',
    }}>Loading chart…</div>
  ),
  // Disable SSR — Recharts needs the DOM to measure its container,
  // so server-render output is empty/0-size anyway. Skipping SSR
  // saves the parser cost server-side too.
  ssr: false,
});

/**
 * Drop-in replacement: same prop API as the impl, just deferred.
 * Existing callers continue to do `import { RechartsLineChart }` and
 * see no behaviour difference.
 */
export function RechartsLineChart(props: ComponentProps<typeof RechartsLineChartImpl>) {
  return <LazyImpl {...props} />;
}
