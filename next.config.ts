import type { NextConfig } from "next";
import path from 'node:path';
import bundleAnalyzer from '@next/bundle-analyzer';

// `ANALYZE=true npm run build` opens a treemap of the JS bundle in
// the default browser. Use it to find unexpectedly-large deps before
// the size-limit CI gate catches them.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// The backend's WEB port — see airwatch-api/MultiPortServerConfig. Default
// is 18080 (NOT Spring's conventional 8080). Override with NEXT_PUBLIC_PROXY_URL
// for staging / prod / non-default local deployments.
const PROXY_TARGET = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:18080';

// Server-only target used for Next.js's `rewrites()` proxy. Next's
// standalone server makes the upstream HTTP call from INSIDE the
// container, so localhost:18080 (which only resolves on the host) won't
// reach nginx. INTERNAL_API_URL is set in compose to the docker service
// name (`http://nginx:18080`). Falls back to the public URL only for
// `next dev` outside the container.
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || PROXY_TARGET;

// ─── Content-Security-Policy ─────────────────────────────────────────────
// Tight defaults plus the specific exceptions the map / globe / radar stack
// actually needs. Anything new on the page that hits a fresh origin will
// fail loudly in dev (browser console) — that's the point: fail closed.
//
// Why each non-default directive exists:
//   • script-src 'wasm-unsafe-eval' — Cesium ships WebAssembly (terrain
//     decoders). 'unsafe-eval' would be wider; the wasm-only relaxation
//     is the modern, narrower equivalent.
//   • script-src 'unsafe-inline' (dev only) — Next dev injects inline HMR
//     bootstrapping. Production builds drop it; the prod-only directive
//     below uses a stricter set.
//   • worker-src 'self' blob: — Cesium instantiates workers from blob URLs
//     (this is how its bundler ships worker code).
//   • style-src 'unsafe-inline' — Tailwind's utility runtime + leaflet-draw
//     write inline styles for marker positioning. Replacing this with hashes
//     would mean shipping a hash for every utility variant the page touches.
//   • img-src + blob: + data: — leaflet's raster decoder pipes decoded tiles
//     through blob/data URLs.
//   • connect-src — same-origin for the proxied API + the third-party tile
//     and metadata feeds we actually call. WSS for the live flight feed.
//
// HTTPS-only directives (HSTS + upgrade-insecure-requests) are gated behind
// HTTPS_ENABLED — they BREAK plain-HTTP local deploys because the browser
// rewrites every http:// request to https:// and our backend / WS port have
// no TLS listener, so fetches/WS connections are refused. Set
// HTTPS_ENABLED=true only when a TLS-terminating proxy (nginx with cert,
// caddy, traefik) sits in front.
// ─────────────────────────────────────────────────────────────────────────
const httpsReady = process.env.HTTPS_ENABLED === 'true';

// CSP itself moved to proxy.ts — every request gets a fresh nonce that
// Next.js stamps on its inline scripts, replacing 'unsafe-inline' with
// strict per-script verification. The remaining headers are constant
// per request so they stay in next.config (faster than running the
// proxy layer for them).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // accelerometer + gyroscope are (self), not (), because /ar uses the
    // DeviceOrientation API (useDeviceOrientation hook) for the live AR
    // sky-view. Both events are blocked by the browser otherwise — the
    // console fills with "Permissions policy violation: accelerometer is
    // not allowed in this document". microphone=(self) covers the /voice
    // command parser's getUserMedia({audio:true}) call. camera stays ()
    // until the AR viewfinder ships in stage 2.
    value: 'accelerometer=(self), camera=(), geolocation=(self), gyroscope=(self), magnetometer=(), microphone=(self), payment=(), usb=()',
  },
  // HSTS pins the browser to HTTPS for the configured max-age. CRITICAL:
  // never emit it from a plain-HTTP deploy — the browser caches the pin for
  // a year and will refuse to talk to localhost:13000 over http even after
  // you fix the server. Only on when TLS is actually in front.
  ...(httpsReady ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained `.next/standalone/server.js`
  // that the Docker image runs directly — no `npm install` at runtime, no
  // node_modules in the final layer. Cuts the production image from ~1 GB
  // to ~150 MB and means the runtime container has no compiler / package
  // manager to weaponise if something gets RCE.
  output: 'standalone',
  // Phase 3 — emit .js.map files alongside production JS chunks so the
  // admin shell's FrontendErrorReporter can resolve minified stack
  // traces back to original source positions. The maps are referenced
  // by the JS files via `//# sourceMappingURL=...`, which the browser
  // ignores in production but the reporter (sourceMapResolver.ts) uses
  // to rewrite the stack before POSTing.
  //
  // Trade-off: maps are ~2-3× the JS size and are publicly fetchable
  // from /_next/static/chunks/*.js.map. Source code structure is
  // exposed to anyone who fetches the maps. Acceptable here because:
  //   1. The admin shell is gated behind /admin/login on a loopback
  //      nginx (13099) — non-admin traffic never reaches it.
  //   2. The public app's secrets aren't in the source — all secrets
  //      come from server-side env vars at runtime.
  //   3. Server-side resolution would need a Java sourcemap parser,
  //      which is more code surface than the trade-off justifies for
  //      the current threat model.
  productionBrowserSourceMaps: true,
  // Cap the per-request body Next.js buffers when the proxy runs. Default
  // is 10 MB which is generous for our log-sink endpoints (web-vitals +
  // client-error each ship a few KB at most). 64 KB is comfortably above
  // the largest legitimate payload (a 4 KB stack trace + headers) but
  // small enough that a malicious client can't tie up server memory by
  // streaming gigabytes. Per-route handlers do their own validation on
  // top — defense in depth.
  experimental: {
    proxyClientMaxBodySize: '64kb',
  },
  images: {
    // Airline logos are now served same-origin via /logos/<size>/<iata>.png
    // (proxied by nginx to pics.avs.io). next/image's loader treats
    // same-origin URLs as already-trusted, so no remotePatterns entry is
    // needed. If a future feature loads images from a NEW external host,
    // add it here AND to the CSP img-src list.
    remotePatterns: [],
  },
  async headers() {
    return [
      // Security headers everywhere.
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // `_next/static/:path*` does NOT need a manual Cache-Control rule —
      // Next.js already sets `public, max-age=31536000, immutable` on
      // hashed chunks itself (and from 16.x prints a build-time warning
      // when applications shadow the same value). Hashing makes the URL
      // change whenever the bytes change, so the "immutable" assertion
      // stays correct without our intervention.
      // HTML pages MUST revalidate on every visit — otherwise Chrome's
      // HTTP cache happily serves the previous build's HTML pointing at
      // chunk filenames that already changed. Symptom: classic "works in
      // incognito / Edge / Firefox, broken in Chrome regular" because
      // Chrome regular is the only browser-profile carrying the stale
      // cached HTML. `no-cache` (NOT `no-store`) lets the browser keep
      // a copy but only after asking the server "still current?".
      //
      // Negative-lookahead skips:
      //   _next/    — Next-internal static + image-optimizer routes
      //   api/      — proxied API responses (their own Cache-Control)
      //   cesium/   — versioned Cesium assets, safe to cache
      //
      // tiles/, weather-radar/, logos/ removed — those paths used to
      // hit the server-side proxy; everything is now direct CDN, so no
      // request ever reaches Next.js on those paths.
      {
        source: '/:path((?!_next/|api/|cesium/).*)',
        missing: [
          // Skip the rule when the request looks like a static asset
          // (has a typical file extension). Plain HTML routes have none.
          { type: 'header', key: 'next-router-prefetch' },
        ],
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Back-end API proxy (the only remaining server-side rewrite).
      // /tiles/*, /weather-radar/*, /logos/* used to live here; all
      // three were removed when their consumers moved to direct CDN
      // calls. See src/components/map/mapStyles.ts header for the
      // full migration rationale.
      {
        source: '/api/proxy/:path*',
        destination: `${INTERNAL_API_URL}/:path*`,
      },
      // Public telemetry beacons. In prod nginx routes /admin/api/stats/
      // ingest/* straight to the backend (AdminAuthFilter explicitly
      // allow-lists this prefix). In dev we mirror that so beacons from
      // <StatsBeacon> + Settings map-style change land at the backend
      // instead of falling through to a Next.js 404. Keeps the dev
      // network panel clean and the view-count metric accurate locally.
      {
        source: '/admin/api/stats/ingest/:path*',
        destination: `${INTERNAL_API_URL}/admin/api/stats/ingest/:path*`,
      },
    ];
  },
  // Stub out @spz-loader/core: Cesium's GltfSpzLoader imports it eagerly,
  // but @spz-loader/core/dist/index.js embeds its ~1 MB WebAssembly module
  // as a single JS template literal containing bytes like `\00` and `\01`
  // — both Webpack and Turbopack emit these verbatim, and JS engines
  // reject them as invalid octal escapes in template literals
  // (SyntaxError → /globe shows a black screen). AirWatch never loads
  // Gaussian-Splatting 3D-Tiles content, so we alias the package to a
  // no-op shim in src/lib/stubs/spz-loader.js. Documented at length
  // there; if you ever need real SPZ support, remove this alias and find
  // a workaround for the bundler issue (e.g. a custom loader that
  // re-encodes the template, or wait for an upstream @spz-loader fix).
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@spz-loader/core': path.resolve(__dirname, 'src/lib/stubs/spz-loader.js'),
    };
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
