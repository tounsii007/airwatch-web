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
 * data. Stack traces are capped at 4 KB upstream to keep cardinality
 * manageable in Loki.
 *
 * Rate-limit shape: rough fixed window (10 errors / IP / minute) so a
 * runaway useEffect can't DoS our log pipeline. Implemented with an
 * in-memory map — small and per-instance, but the worst case is the
 * page sees no further reports for the rest of the minute.
 */
import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
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
  // Coarse client identifier — IP from forwarded headers or socket.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!rateLimit(ip)) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  let body: ClientErrorReport;
  try {
    body = (await req.json()) as ClientErrorReport;
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_json' }, { status: 400 });
  }

  // Structured log line — Promtail's pipeline_stages regex extracts
  // `level` from the leading `ERROR` token and labels the stream
  // with service=web (already from docker-compose).
   
  console.error(
    JSON.stringify({
      level: 'ERROR',
      kind: 'client_error',
      scope: body.scope ?? 'route',
      digest: body.digest ?? null,
      message: body.message ?? '(no message)',
      url: body.url ?? null,
      ua: body.ua ?? null,
      ts: body.ts ?? Date.now(),
      ip,
      // Stack last so log readers can scan the line head and decide
      // whether to drill in.
      stack: body.stack ?? null,
    }),
  );

  return NextResponse.json({ ok: true });
}
