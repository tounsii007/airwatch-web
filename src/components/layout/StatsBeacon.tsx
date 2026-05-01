'use client';

/**
 * Lightweight client-side telemetry: emits a view-tracking beacon on every
 * route navigation, and a map-style beacon when the user changes the map
 * style in Settings. Both land at the admin-stats ingest endpoint, which
 * the AdminAuthFilter explicitly allows through unauthenticated.
 *
 * Why beacon (not regular fetch):
 *   navigator.sendBeacon survives page-unload — the browser POSTs it
 *   reliably even when the user immediately closes the tab. The ingest
 *   endpoints reply 204 with no body which is exactly what beacons want.
 *
 * Why client-side (not server-side route logging):
 *   Many of our routes never round-trip to the api server (the SPA
 *   handles them client-only), so server logs would massively
 *   under-count. Tracking in the client + an explicit beacon is the
 *   only way to get accurate per-route popularity for an SPA.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/lib/stores/settingsStore';

const VIEW_ENDPOINT = '/admin/api/stats/ingest/view';
const MAP_STYLE_ENDPOINT = '/admin/api/stats/ingest/map-style';

function send(endpoint: string, body: object): void {
  // Defensive: only run in the browser (this component is a client
  // component but the tree may briefly render on the server).
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  try {
    const json = JSON.stringify(body);
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(endpoint, new Blob([json], { type: 'application/json' }));
    } else {
      // Old-browser fallback. keepalive lets the request survive a
      // navigation away from this page.
      void fetch(endpoint, {
        method: 'POST',
        body: json,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Beacons MUST never break the page. Swallow any serialisation /
    // network error silently.
  }
}

export function StatsBeacon() {
  const pathname = usePathname();
  const mapStyle = useSettingsStore((s) => s.mapStyle);

  // Track the previous values so we don't emit duplicate beacons when
  // an unrelated re-render fires (Zustand sometimes triggers extra ones
  // on hydration).
  const lastView = useRef<string | null>(null);
  const lastStyle = useRef<string | null>(null);

  // ── View beacon ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!pathname || pathname === lastView.current) return;
    // Skip the admin route group entirely — those navigations come from
    // operators, not end users, and shouldn't pollute the popularity
    // chart.
    if (pathname.startsWith('/admin')) {
      lastView.current = pathname;
      return;
    }
    lastView.current = pathname;
    send(VIEW_ENDPOINT, {
      app: 'web',
      routePath: pathname,
      // Country is left null here — the api-side recorder fills it in
      // from the request IP via GeoIP (Phase 2). Browsers don't have
      // reliable access to the user's country.
      countryCode: null,
    });
  }, [pathname]);

  // ── Map style beacon ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapStyle || mapStyle === lastStyle.current) return;
    lastStyle.current = mapStyle;
    send(MAP_STYLE_ENDPOINT, {
      app: 'web',
      mapStyle,
    });
  }, [mapStyle]);

  return null;
}
