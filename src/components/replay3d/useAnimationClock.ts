'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Params {
  durationMs: number;
  /** Playback rate: 1 = real-time, 60 = 1 min per sec, etc. */
  speed: number;
  playing: boolean;
}

/**
 * requestAnimationFrame-driven clock. Only re-renders when time actually
 * changes (not every rAF tick) to keep React cost low; deck.gl re-reads the
 * value via its own render loop.
 */
export function useAnimationClock({ durationMs, speed, playing }: Params) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const seek = useCallback((tMs: number) => {
    setCurrentTimeMs(Math.min(Math.max(0, tMs), durationMs));
  }, [durationMs]);

  useEffect(() => {
    if (!playing) {
      lastFrameRef.current = null;
      return;
    }
    const step = (frameTime: number) => {
      const prev = lastFrameRef.current ?? frameTime;
      lastFrameRef.current = frameTime;
      const deltaMs = (frameTime - prev) * speed;
      setCurrentTimeMs((t) => {
        const next = t + deltaMs;
        if (next >= durationMs) return durationMs;
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = null;
    };
  }, [playing, speed, durationMs]);

  /** Auto-stop at the end — caller decides whether to loop. */
  const atEnd = currentTimeMs >= durationMs;

  return { currentTimeMs, atEnd, seek };
}
