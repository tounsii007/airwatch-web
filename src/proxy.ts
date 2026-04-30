/**
 * Per-request CSP nonce + security headers.
 *
 * Why proxy.ts instead of next.config.ts headers():
 *   The headers() config bakes one CSP at build time. Per-request nonces
 *   require a new value on every response, which only the proxy layer
 *   can emit. Once the nonce is propagated to <NextScript>, the browser
 *   will accept ONLY inline scripts whose nonce matches — XSS via
 *   injected <script>...</script> is blocked even though we still allow
 *   the framework's own inline runtime.
 *
 * File-name note: Next 16.2 deprecated the `middleware.ts` convention
 *   in favour of `proxy.ts` (same runtime, same matcher API, same
 *   request/response shape — purely a rename). This file is the new
 *   entry point. The old `middleware.ts` was deleted at the same commit.
 *
 * What runs:
 *   1. Generate a fresh 122-bit nonce (cryptographically random, base64).
 *      crypto.randomUUID() is UUID v4, so 6 bits are fixed format markers
 *      — 122 bits of usable entropy, well above the 64 bits CSP guidance
 *      recommends.
 *   2. Build the CSP including `script-src 'self' 'nonce-${nonce}' …`
 *      (note: NO 'unsafe-inline' — the nonce replaces it).
 *   3. Forward the nonce to the page via a request header (`x-nonce`).
 *      The root layout reads it and passes to <NextScript nonce={...}>.
 *   4. Set CSP on the response.
 *
 * Performance:
 *   The runtime is the Edge runtime (V8 isolate) — proxy adds ~1 ms
 *   per request. crypto.randomUUID() is hardware-accelerated.
 *
 * What's NOT here:
 *   X-Content-Type-Options, X-Frame-Options, Permissions-Policy, etc. —
 *   those stay in next.config.ts headers() because they're constant per
 *   request and the static-config path is faster than proxy for them.
 */
import { NextRequest, NextResponse } from 'next/server';

// HTTPS-aware directives. The flag is read at module-load time (Edge
// runtime starts a fresh isolate per node, so the env is current).
const httpsReady = process.env.HTTPS_ENABLED === 'true';
const cspReportOnly = process.env.CSP_REPORT_ONLY === 'true';

// Skip proxy for static assets and pre-rendered output — those don't
// have inline scripts that need nonces, and adding ~1 ms per tile
// request would be wasteful.
export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     *   _next/static (build output)
     *   _next/image  (image optimizer)
     *   favicon.ico, robots.txt, sitemap.xml
     *   tile / asset proxy paths (handled by nginx, no inline scripts)
     */
    {
      source:
        '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|tiles/|weather-radar/|logos/|cesium/|api/proxy/|ws/).*)',
      missing: [
        // Skip prefetch metadata requests — no rendered HTML to nonce-stamp.
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};

export function proxy(request: NextRequest) {
  // 122-bit (UUID v4 entropy) cryptographically random nonce, base64-url
  // encoded. crypto.randomUUID is available in the Edge runtime; we
  // strip dashes so the value is shorter and remains URL-safe in headers.
  const rawUuid = crypto.randomUUID().replace(/-/g, '');
  const nonce = Buffer.from(rawUuid, 'hex').toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets a nonced script load further scripts without
    // each one needing its own nonce. Combined with the nonce, this is
    // the tightest practical CSP for a Next.js app.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(httpsReady ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  // Two-channel propagation. Both are required:
  //   * Request header `x-nonce` — read by the layout to render
  //     `<meta>` tags or pass to client-only nonce consumers.
  //   * Request header `Content-Security-Policy` — Next.js inspects
  //     this and automatically stamps the nonce on every inline
  //     <script> it emits (RSC payload, hydration, chunk loader).
  //     Without this, our nonce is just a string nobody applies and
  //     the page breaks.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // The response carries the SAME policy back to the browser so it
  // enforces what the server stamped. In report-only mode the browser
  // logs violations instead of blocking — useful for staging burn-in.
  response.headers.set(
    cspReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    csp,
  );

  return response;
}
