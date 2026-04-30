import type { NextConfig } from "next";

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
//   • script-src 'wasm-unsafe-eval' — Cesium + maplibre ship WebAssembly
//     (terrain + protomaps decoders). 'unsafe-eval' would be wider; the
//     wasm-only relaxation is the modern, narrower equivalent.
//   • script-src 'unsafe-inline' (dev only) — Next dev injects inline HMR
//     bootstrapping. Production builds drop it; the prod-only directive
//     below uses a stricter set.
//   • worker-src 'self' blob: — Cesium + maplibre instantiate workers from
//     blob URLs (this is how their bundlers ship worker code).
//   • style-src 'unsafe-inline' — Tailwind's utility runtime + leaflet-draw
//     write inline styles for marker positioning. Replacing this with hashes
//     would mean shipping a hash for every utility variant the page touches.
//   • img-src + blob: + data: — leaflet/maplibre raster decoders pipe
//     decoded tiles through blob/data URLs.
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
const isDev      = process.env.NODE_ENV !== 'production';
const httpsReady = process.env.HTTPS_ENABLED === 'true';

// CSP_REPORT_ONLY=true emits the same policy as `Content-Security-Policy-
// Report-Only` instead of enforcing it. Browsers log every violation to
// the console + (when set) POST a JSON report to `report-uri` — but
// nothing is BLOCKED. Useful for staging environments to find what new
// origins a feature is calling before tightening the enforcing policy.
// Pair with `report-uri` set to a logging endpoint to capture violations
// from real users; without it, only DevTools shows them.
const cspReportOnly = process.env.CSP_REPORT_ONLY === 'true';

const csp = [
  "default-src 'self'",
  // Cesium loads its workers + assets from cesium.com at runtime via
  // CESIUM_BASE_URL. Keeping it in script-src and connect-src.
  //
  // 'unsafe-inline' is unconditional because Next.js 16 + App Router emits
  // multiple <script>self.__next_f.push(...)</script> tags for React Server
  // Components streaming hydration. Without 'unsafe-inline' those are
  // blocked, React never hydrates, and any next/dynamic component sticks
  // on its server-rendered loading fallback forever (the symptom: the
  // map page stays on "INITIALIZING FLIGHT SYSTEMS..." indefinitely).
  //
  // The proper fix is per-request nonces via Next.js middleware that sets
  // a fresh nonce on every response and propagates it to <NextScript>.
  // That's tracked as a follow-up; in the meantime this matches what
  // Vercel/Next-deployed apps ship by default. Auto-escaping in JSX
  // bounds the XSS surface — if you ever interpolate raw user HTML you
  // need to sanitise regardless of the CSP setting.
  // No external script origins. Cesium's runtime now serves from
  // /cesium/* (mirrored at build time, see scripts/copy-cesium-assets.mjs).
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // EVERYTHING is now same-origin. Tiles, weather, airline logos and
  // Cesium 3D-globe assets all flow through nginx — the browser only
  // ever talks to localhost:${WEB_PORT}. The CSP can therefore stay as
  // strict as `'self'` for cross-origin destinations, with the usual
  // data:/blob: relaxations for the leaflet/maplibre decoded-tile
  // pipeline that pipes raster bytes through blob URLs internally.
  "img-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  // ws: is the WebSocket scheme token — necessary for the live flight
  // feed (browser opens ws://localhost:13000/ws/flights, nginx upgrades
  // and proxies to the api replicas). wss: is for HTTPS deployments.
  // No cross-origin destinations are needed any more.
  "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // upgrade-insecure-requests rewrites every http:// reference (including
  // absolute ws://) to https/wss. Only safe when EVERY origin we talk to
  // has a TLS endpoint — otherwise the browser refuses the connection.
  ...(httpsReady ? ["upgrade-insecure-requests"] : []),
].join('; ');

const securityHeaders = [
  // Either enforce or report-only — never both at once on the same policy
  // (the browser would still enforce, defeating the purpose of report-only).
  // For "discover new origins without breaking the page" deploy a SECOND
  // tighter Report-Only policy alongside this one; keeping both equal lets
  // CSP_REPORT_ONLY toggle the entire CSP off for emergency debugging.
  {
    key: cspReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    value: csp,
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
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
      // Hashed Next.js chunks are content-addressed by filename — once
      // built, the bytes never change for a given URL, so cache them
      // aggressively. Bumps performance + insulates the user from
      // intermediate proxy caches.
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
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
      //   tiles/    — nginx tile proxy (7-day immutable from upstream)
      //   weather-radar/ + logos/ — same as tiles, nginx-managed
      //   cesium/   — versioned Cesium assets, safe to cache
      //   *.<ext>   — any file with a recognisable extension (favicon
      //               etc.) is named-stable, cache-friendly
      {
        source: '/:path((?!_next/|api/|tiles/|weather-radar/|logos/|cesium/).*)',
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
      // ── Existing back-end API proxy ─────────────────────────────────────
      {
        source: '/api/proxy/:path*',
        destination: `${INTERNAL_API_URL}/:path*`,
      },
      // ── Map tile providers — same-origin masquerade ─────────────────────
      // Browser sees /tiles/carto/... → nginx → CARTO CDN. The upstream
      // hostname stays inside the docker network; the network tab in
      // DevTools only ever shows http://localhost:13000/tiles/...
      //
      // Cache hit ratio is visible via the X-Cache-Status response header
      // that nginx adds (HIT / MISS / EXPIRED / STALE).
      {
        source: '/tiles/:path*',
        destination: `${INTERNAL_API_URL}/tiles/:path*`,
      },
      {
        source: '/weather-radar/:path*',
        destination: `${INTERNAL_API_URL}/weather-radar/:path*`,
      },
      {
        source: '/logos/:path*',
        destination: `${INTERNAL_API_URL}/logos/:path*`,
      },
    ];
  },
};

export default nextConfig;
