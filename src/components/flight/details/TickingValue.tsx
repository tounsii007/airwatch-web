'use client';

import { memo, useEffect, useRef, useState } from 'react';

interface Props {
  /** The displayed value. Equality test uses `===` — pre-format numbers
   *  to a string with the same precision the user sees, so 26.6 → 26.6
   *  doesn't trigger a flash but 26.6 → 26.7 does. */
  value: string | number | null | undefined;
  className?: string;
  /** Tailwind utility for the brief flash colour. Default `text-[var(--accent)]`. */
  flashClass?: string;
  /** How long the flash stays before the value settles back. Default 1.4 s. */
  flashDurationMs?: number;
  /** Optional fallback rendered when value is null/undefined. */
  placeholder?: string;
}

/**
 * Renders a value that briefly highlights whenever its content changes —
 * a "tick" effect borrowed from financial dashboards. Designed for the
 * flight-details panel's stat readouts (alt / spd / hdg / lat / lon)
 * where the WS push otherwise replaces every value silently every few
 * seconds, leaving the user no cue for what just changed.
 *
 * <h3>Why memo + value-keyed effect</h3>
 * `memo` so a parent re-render with the same value doesn't reset the
 * flash timer. The effect's dependency on the rendered string means
 * it fires exactly when the user-visible content actually changed —
 * not when a different prop on the parent caused a re-render with
 * the same value.
 *
 * <h3>Visual contract</h3>
 * Default flash class is `text-[var(--accent)]` paired with a
 * `transition-colors duration-700`. The element keeps its outer
 * className so the parent owns layout / sizing.
 */
export const TickingValue = memo(function TickingValue({
  value,
  className = '',
  flashClass = 'text-[var(--accent)]',
  flashDurationMs = 1400,
  placeholder = '—',
}: Props) {
  const display = value === null || value === undefined ? placeholder : String(value);
  const [flashing, setFlashing] = useState(false);
  const previousRef = useRef<string>(display);

  useEffect(() => {
    if (previousRef.current === display) return;
    previousRef.current = display;
    setFlashing(true);
    const id = setTimeout(() => setFlashing(false), flashDurationMs);
    return () => clearTimeout(id);
  }, [display, flashDurationMs]);

  return (
    <span className={`${className} transition-colors duration-700 ${flashing ? flashClass : ''}`.trim()}>
      {display}
    </span>
  );
});
