'use client';

/**
 * Subscribes to `document.visibilitychange` and returns `true` while the
 * tab is foreground, `false` while it is hidden / backgrounded.
 *
 * Used to gate ongoing decorative work when the user can't see the page:
 *   * pause CSS animations (radar sweep, neon flicker, brand pulse)
 *   * skip raf-driven counters
 *   * postpone WebSocket reconnect backoff
 *
 * SSR-safe: returns `true` during server render and during the first
 * hydration frame, so the markup is identical regardless of what the
 * tab was doing when the user came back.
 *
 * Why a hook instead of a global: each consumer wants the React signal
 * (re-render on flip), not just imperative access. Listening once
 * inside this hook + re-using its return value keeps the listener
 * count at 1 per consumer instance — the underlying
 * `document.visibilityState` lookup is O(1) so no caching needed.
 */
import { useEffect, useState } from 'react';

export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => setIsVisible(document.visibilityState === 'visible');
    update(); // sync once on mount so we don't miss a head-start in the hidden state
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return isVisible;
}
