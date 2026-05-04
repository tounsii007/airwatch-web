'use client';

import { useEffect, useState } from 'react';
import { relativeTime, formatDeDateTime } from '@/app/(admin)/admin/dashboard/utils';

/**
 * Hydration-safe time renderer.
 *
 * <h3>The bug we're fixing</h3>
 * Server-rendering {@code relativeTime("2026-05-03T10:00Z")} computes
 * "5m" relative to the server clock. Hydration on the client computes
 * the same string ~100 ms later, sees "5m" again, fine. But when the
 * gap drifts past the next minute boundary, server says "5m" and
 * client says "6m" — React hits #418, throws away the server tree,
 * re-renders the entire component. That's the noisy "Minified React
 * error #418" we've been suppressing with {@code suppressHydrationWarning}.
 *
 * <h3>Fix</h3>
 * Render the ISO string verbatim during SSR (or fall back to absolute
 * Berlin time), then on the client effect tick, swap in the live
 * relative value and re-tick every {@link UPDATE_INTERVAL_MS} so the
 * label stays current as the clock moves.
 *
 * Two display modes:
 *   * `mode="relative"` → "3m ago" / "2h ago"
 *   * `mode="absolute"` → "03.05.2026, 14:23:45" (Europe/Berlin)
 *   * `mode="both"`     → "03.05.2026, 14:23:45 (3m ago)"
 *
 * Tooltip always carries the absolute time so hover gives precise info.
 */

const UPDATE_INTERVAL_MS = 30_000; // tick every 30 s — granular enough for minute-level labels

interface Props {
  /** ISO-8601 timestamp (or epoch ms — auto-detected). */
  iso: string | number;
  mode?: 'relative' | 'absolute' | 'both';
  /** Optional suffix appended to relative output, default " ago". */
  suffix?: string;
  /** Style override. */
  style?: React.CSSProperties;
  className?: string;
}

export function ClientTime({ iso, mode = 'relative', suffix = ' ago', style, className }: Props) {
  const isoStr = typeof iso === 'number' ? new Date(iso).toISOString() : iso;
  // SSR + first-paint value: absolute time. Stable, no clock-drift risk.
  const initialAbsolute = formatDeDateTime(isoStr);
  const [label, setLabel] = useState<string>(() => initialFor(mode, isoStr, suffix));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setLabel(currentFor(mode, isoStr, suffix));
    tick();
    if (mode === 'absolute') return; // no need to re-tick for absolute mode
    const id = window.setInterval(tick, UPDATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isoStr, mode, suffix]);

  // Before mount, render the SSR-deterministic value to avoid #418.
  // After mount, the effect above swaps in the live value.
  return (
    <time
      dateTime={isoStr}
      title={initialAbsolute}
      style={style}
      className={className}
      // suppressHydrationWarning kept as a defence-in-depth — the SSR
      // initial value matches what React renders on first client paint
      // because we use the SAME absolute formatter on both sides.
      suppressHydrationWarning
    >
      {mounted ? label : initialFor(mode, isoStr, suffix)}
    </time>
  );
}

function initialFor(mode: Props['mode'], iso: string, suffix: string): string {
  // SSR: absolute time always (clock-stable across server & client).
  // The effect on mount swaps in relative if requested.
  if (mode === 'relative') return formatDeDateTime(iso);
  if (mode === 'both')     return formatDeDateTime(iso);
  return formatDeDateTime(iso);
}

function currentFor(mode: Props['mode'], iso: string, suffix: string): string {
  if (mode === 'absolute') return formatDeDateTime(iso);
  if (mode === 'both')     return `${formatDeDateTime(iso)} (${relativeTime(iso)}${suffix})`;
  return `${relativeTime(iso)}${suffix}`;
}
