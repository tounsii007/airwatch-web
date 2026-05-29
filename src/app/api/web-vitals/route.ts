/**
 * Web-Vitals sink. Same shape as /api/client-error: rate-limit per IP,
 * then emit a structured stdout line for Promtail to ship to Loki.
 * Distinct `kind=web_vitals` label keeps the metrics separable from
 * error logs in Grafana queries.
 *
 * Body-size + per-replica caveats: see /api/client-error/route.ts —
 * same trade-offs apply.
 */
import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
// Each page emits 5 metrics on first paint + 1 INP per interaction —
// 30 / minute / IP / *replica* is comfortable for legit users, blocks
// runaway loops. With 5 replicas a single IP can hit 150/min total
// before any one replica starts dropping; Web Vitals are operational
// metrics, not auth-protected, so duplicates across replicas are fine.
const MAX_PER_WINDOW = 30;
// 4 KB — a vitals payload is < 300 bytes; this is generous slack.
const MAX_BODY_BYTES = 4 * 1024;
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

interface VitalsBody {
  metric?: string;
  value?: number;
  rating?: string;
  delta?: number;
  id?: string;
  navigationType?: string;
  url?: string;
  ts?: number;
}

export async function POST(req: Request) {
  // Enforce JSON Content-Type — sendBeacon defaults to text/plain when
  // misused, and we don't want to spend cycles parsing arbitrary blobs.
  if (req.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return new Response('expected application/json', { status: 415 });
  }

  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const xri = req.headers.get('x-real-ip');
  const ip = xff || xri || 'unknown';

  // Both forwarded-IP headers missing — reject unless this is a local
  // dev call. Keeps a direct-to-origin attacker from sharing one
  // `unknown` bucket with all other unforwarded traffic.
  if (!xff && !xri) {
    const host = req.headers.get('host') ?? '';
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
      return new Response('Bad Request', { status: 400 });
    }
  }

  if (!rateLimit(ip)) {
    // 204: don't waste bandwidth on a body the beacon won't read.
    return new NextResponse(null, { status: 204 });
  }

  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let body: VitalsBody;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 });
    }
    body = JSON.parse(text) as VitalsBody;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // INFO level — Web Vitals are normal operational data, not errors.
  // Promtail's regex extractor sets level=INFO from the line below.

  console.info(
    JSON.stringify({
      level: 'INFO',
      kind: 'web_vitals',
      metric: typeof body.metric === 'string' ? body.metric.slice(0, 32) : null,
      value: typeof body.value === 'number' ? body.value : null,
      rating: typeof body.rating === 'string' ? body.rating.slice(0, 32) : null,
      delta: typeof body.delta === 'number' ? body.delta : null,
      navigationType: typeof body.navigationType === 'string' ? body.navigationType.slice(0, 32) : null,
      url: typeof body.url === 'string' ? body.url.slice(0, 2048) : null,
      ts: body.ts ?? Date.now(),
    }),
  );

  // 204 for sendBeacon — no body needed.
  return new NextResponse(null, { status: 204 });
}
