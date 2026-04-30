'use client';

/**
 * Animated number that tweens from a previous value to a new one over
 * `duration` ms. Use anywhere a counter would otherwise jump abruptly
 * (live flight count, request totals, web-vitals values).
 *
 * Implementation:
 *   * requestAnimationFrame loop with cubic-out easing — matches the
 *     `--ease-out` curve used elsewhere in the design system.
 *   * Cleanup on unmount or value change cancels the in-flight rAF
 *     so we never leak callbacks.
 *   * Locale-aware formatting via `Intl.NumberFormat` for thousands
 *     separators (1,234 in en-US, 1.234 in de-DE).
 *   * Honours `prefers-reduced-motion` — snaps directly to the new
 *     value if the user opted out of motion.
 */

import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({
  value,
  duration = 800,
  decimals = 0,
  className = '',
  locale,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  locale?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Reduced-motion users get an instant snap, but we still defer the
    // setState onto the next frame rather than firing it synchronously
    // inside the effect body — that avoids React's
    // `react-hooks/set-state-in-effect` cascading-render warning while
    // matching the rAF scheduling of the animated path below.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !Number.isFinite(value)) {
      rafRef.current = requestAnimationFrame(() => {
        setDisplay(value);
        fromRef.current = value;
      });
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatter =
    typeof Intl !== 'undefined'
      ? new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : null;

  const text = formatter
    ? formatter.format(display)
    : decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toString();

  return <span className={`tabular ${className}`}>{text}</span>;
}
