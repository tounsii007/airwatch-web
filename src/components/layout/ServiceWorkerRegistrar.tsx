'use client';

/**
 * Registers the AirWatch service worker once on first client mount.
 *
 * Defensive checks:
 *   * Only in production (dev's HMR + SW caching = stale-bundle hell).
 *   * Only when navigator.serviceWorker exists (older Safari, IE11
 *     proxies, headless test runners).
 *   * Wraps in try/catch so a registration failure never breaks the
 *     page. The app works fine without the SW — it just loses the
 *     offline + tile-cache benefits.
 *
 * Lifecycle: on every page load Chrome checks /sw.js for byte changes.
 * A new sw.js triggers `install` → `waiting` → (after all tabs close)
 * `activate`. The CACHE_VERSION constant inside sw.js drives full
 * cache reset; bump it to force a refresh.
 */
import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // Silently fail — see file header for rationale.
        });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
