'use client';

/**
 * Reactive `prefers-reduced-motion: reduce` media-query hook.
 *
 * The CSS in globals.css already strips every CSS-driven animation +
 * transition when the user opts in. This hook is for the JS-driven
 * cases the CSS can't reach:
 *   * SVG SMIL `<animate>` elements (e.g. WorldMap radar pulse)
 *   * requestAnimationFrame loops (CountUp already self-checks; new
 *     code can call this hook instead of re-implementing the probe)
 *   * Map / globe camera tweens that aren't expressed as CSS
 *
 * SSR-safe: returns `false` during render-on-server (no window) and
 * resolves to the real preference on first client paint. Subscribes
 * to the matchMedia change event so flipping the OS setting mid-
 * session is honoured without a reload.
 */
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Modern API; older Safari uses addListener — guard for both.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mql as any).addListener(handler);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return () => (mql as any).removeListener(handler);
    }
  }, []);

  return reduced;
}
