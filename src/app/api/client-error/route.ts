/**
 * Client-side error sink.
 *
 * The browser's error boundaries POST sanitised reports here. We log
 * once to stdout in a structured shape that Promtail picks up via the
 * `service=web` label and ships to Loki — visible in Grafana under the
 * "AirWatch — Logs" dashboard with `level=ERROR` filter.
 *
 * Why a server endpoint at all when the browser console already shows
 * the error: one developer's local console isn't the production
 * support channel. With Loki in the loop, an ops-on-call sees the
 * trend ("we're getting 50 of these per minute since the last
 * deploy") instead of one user's anecdote.
 *
 * Privacy: the endpoint receives ONLY the data the browser explicitly
 * sends (message, stack, url, ua, digest). No cookies, no fetch'd
 * data.
 *
 * Defense in depth — body size:
 *   1. proxy layer caps every buffered request at 64 KB (next.config
 *      `experimental.proxyClientMaxBodySize`).
 *   2. We re-check Content-Length here in case the request bypassed
 *      the proxy matcher (under /api/* the proxy is currently still
 *      active, but if the matcher ever changes this guard prevents
 *      regression).
 *   3. The stack trace is truncated to MAX_STACK_BYTES post-parse.
 *
 * Rate-limit shape: rough fixed window per IP. Note the `MAX_PER_WINDOW`
 * is per *replica* — with 5 API replicas behind nginx, a single IP can
 * legitimately hit 5× this number across the fleet. Acceptable for a
 * log sink (worst-case duplicate logs, never lost ones); a Redis-backed
 * shared counter is the upgrade path if cross-replica accuracy ever
 * matters here.
 */
import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
// 16 KB — a 4 KB stack + url + ua + digest comfortably fits, but a
// runaway loop dumping a 10 MB JSON payload doesn't.
const MAX_BODY_BYTES = 16 * 1024;
// Stack-trace cap (post-parse). Loki cardinality stays tractable.
const MAX_STACK_BYTES = 4 * 1024;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count++;
  return true;
}

interface ClientErrorReport {
  message?: string;
  digest?: string;
  stack?: string;
  url?: string;
  ua?: string;
  scope?: 'route' | 'global';
  ts?: number;
}

export async function POST(req: Request) {
  // Enforce JSON Content-Type at the boundary — drops form-encoded or
  // multipart probes before we touch the body.
  if (req.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return new Response('expected application/json', { status: 415 });
  }

  // Coarse client identifier — IP from forwarded headers or socket.
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const xri = req.headers.get('x-real-ip');
  const ip = xff || xri || 'unknown';

  // If both forwarded-IP headers are missing the request didn't come
  // through our ingress — reject unless we're talking to localhost
  // (dev / smoke-test). Without this an attacker that reaches the
  // origin directly would share a single `unknown` bucket with everyone
  // else and trivially DOS the log sink.
  if (!xff && !xri) {
    const host = req.headers.get('host') ?? '';
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
      return new Response('Bad Request', { status: 400 });
    }
  }

  if (!rateLimit(ip)) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  // Reject oversized bodies BEFORE buffering — a Content-Length header
  // is mandatory for fetch/XHR POSTs from browsers, so this catches
  // the common case cheaply. Streamed requests without Content-Length
  // are unusual from a browser; they fall through to the post-parse
  // guard below.
  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, reason: 'body_too_large' },
      { status: 413 },
    );
  }

  let body: ClientErrorReport;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, reason: 'body_too_large' },
        { status: 413 },
      );
    }
    body = JSON.parse(text) as ClientErrorReport;
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_json' }, { status: 400 });
  }

  // Hard cap on stack regardless of what the client sent — this is a
  // server-side invariant the log pipeline relies on.
  const stack =
    typeof body.stack === 'string' ? body.stack.slice(0, MAX_STACK_BYTES) : null;

  // Structured log line — Promtail's pipeline_stages regex extracts
  // `level` from the leading `ERROR` token and labels the stream
  // with service=web (already from docker-compose).

  console.error(
    JSON.stringify({
      level: 'ERROR',
      kind: 'client_error',
      scope: body.scope ?? 'route',
      digest: body.digest ?? null,
      message: typeof body.message === 'string' ? body.message.slice(0, 1024) : '(no message)',
      url: typeof body.url === 'string' ? body.url.slice(0, 2048) : null,
      ua: typeof body.ua === 'string' ? body.ua.slice(0, 512) : null,
      ts: body.ts ?? Date.now(),
      ip,
      // Stack last so log readers can scan the line head and decide
      // whether to drill in.
      stack,
    }),
  );

  return NextResponse.json({ ok: true });
}
