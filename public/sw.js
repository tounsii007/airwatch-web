 

/**
 * AirWatch service worker.
 *
 * Goals (in order of importance):
 *   1. Offline-first for the app shell — the user-agent should at
 *      minimum see the layout + last-known map tiles when network is
 *      out (S-Bahn tunnel, plane, captive-portal-blocked Wi-Fi).
 *   2. Stale-while-revalidate for tiles + airline logos. nginx already
 *      caches them on disk, but the SW layer means even the
 *      localhost:13000 round-trip is skipped.
 *   3. Network-first for /api/proxy and /ws — never serve stale flight
 *      data; it's worse than no data.
 *
 * Versioning: `CACHE_VERSION` bumps invalidate every cached entry on
 * the next install. Bump it whenever:
 *   * The HTML shell changes meaningfully
 *   * A new external host gets added to the tile/asset proxy list
 *   * You ship a new SW that adds a fresh strategy
 *
 * Why hand-rolled instead of next-pwa / workbox: this app's needs are
 * narrow (3 cache strategies, small route surface) and a vendored SW
 * file is easier to audit + reason about than a workbox build pipeline.
 * Plus workbox bundles ~30 KB of runtime; ours is < 3 KB.
 */

// Bump after every change that affects what gets cached or which paths
// the SW intercepts. Old SW deletes its own caches in `activate` when
// the version no longer matches — that's how we evict stale HTML/JS
// referencing the old map-tile URLs (`/tiles/...`) that no longer exist.
const CACHE_VERSION = 'v3';
const SHELL_CACHE = `airwatch-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `airwatch-assets-${CACHE_VERSION}`;

// Static offline fallback served when network is gone AND the
// requested page isn't already in SHELL_CACHE. Distinct from the
// generic "/" home — that returns the live map shell, which doesn't
// degrade gracefully on cold offline. /offline.html is a hand-rolled
// static doc that explains the state + offers a Retry button.
const OFFLINE_FALLBACK = '/offline.html';

// Pages we want available offline. Next.js's hashed _next/static
// chunks are intentionally NOT in this list — they're picked up
// opportunistically by the runtime cache.
const SHELL_URLS = [
  '/',
  '/airports',
  '/airlines',
  '/search',
  '/saved',
  '/stats',
  '/settings',
  '/spotting',
  OFFLINE_FALLBACK,
];

self.addEventListener('install', (event) => {
  // Pre-cache the app shell so first-offline load works.
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // `cache.addAll` aborts on the first failure — wrap each fetch so
      // a single dead URL doesn't kill the whole pre-cache.
      Promise.allSettled(SHELL_URLS.map((url) =>
        fetch(url, { credentials: 'same-origin' })
          .then((res) => res.ok && cache.put(url, res))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Reap old caches on every version bump.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Different origin → never intercept. SW spec already enforces this
  // for cross-origin but the early-return keeps the routing table tidy.
  if (url.origin !== self.location.origin) return;

  // Live API + WebSocket → network only. Stale flight data is worse
  // than an error message.
  if (url.pathname.startsWith('/api/proxy/') || url.pathname.startsWith('/ws/')) {
    return;
  }

  // Web Vitals + client-error sinks — let them pass through. Caching
  // metric POSTs would be nonsense.
  if (url.pathname.startsWith('/api/')) return;

  // Cesium → stale-while-revalidate. Browser sees instant response,
  // network refresh happens in the background.
  //
  // Tiles, logos, weather-radar/tiles used to live here too. They moved
  // to direct CDN URLs (cartocdn / openstreetmap / pics.avs.io / etc.)
  // and the browser handles their cache against the upstream's Cache-
  // Control headers — no SW intercept needed. Same-origin SWs CANNOT
  // intercept cross-origin requests anyway, so leaving the patterns
  // here would only mislead someone reading this file.
  if (url.pathname.startsWith('/cesium/')) {
    event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
    return;
  }

  // Hashed Next.js chunks — cache forever (filenames are content-hashed
  // so a different bundle = different filename).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }

  // HTML pages and everything else → network-first with shell fallback
  // for offline. Network-first means "if you have a connection, show
  // them the freshest copy" while still degrading gracefully offline.
  event.respondWith(networkFirstWithShellFallback(req));
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);

  return cached || (await network) || new Response('', { status: 504 });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function networkFirstWithShellFallback(request) {
  try {
    const res = await fetch(request);
    // Cache successful HTML responses for offline. Don't cache
    // anything with `Cache-Control: no-store`.
    const cacheControl = res.headers.get('cache-control') || '';
    if (res.ok && !cacheControl.includes('no-store')) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    // First try: exact-match the request the user asked for.
    const cached = await cache.match(request);
    if (cached) return cached;
    // Second try: dedicated offline fallback page (hand-rolled HTML
    // that explains the state and surfaces a Retry button).
    const offline = await cache.match(OFFLINE_FALLBACK);
    if (offline) return offline;
    // Third try: home — at least the user sees the shell layout.
    const home = await cache.match('/');
    if (home) return home;
    // Last resort: bare-bones HTML so the browser doesn't show a
    // browser-chrome "no internet" splash.
    return new Response(
      '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>Offline</h1><p>No cached version of this page.</p></body></html>',
      { status: 503, statusText: 'Offline', headers: { 'content-type': 'text/html' } },
    );
  }
}
