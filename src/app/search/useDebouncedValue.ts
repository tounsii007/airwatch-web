'use client';

import { useEffect, useRef, useState } from 'react';

/** Debounces a value by the given delay (ms). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, delayMs]);

  return debounced;
}
