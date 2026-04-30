/**
 * Web-Vitals sink. Same shape as /api/client-error: rate-limit per IP,
 * then emit a structured stdout line for Promtail to ship to Loki.
 * Distinct `kind=web_vitals` label keeps the metrics separable from
 * error logs in Grafana queries.
 */
import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
// Each page emits 5 metrics on first paint + 1 INP per interaction —
// 30 / minute / IP is comfortable for legit users, blocks runaway loops.
const MAX_PER_WINDOW = 30;
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
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!rateLimit(ip)) {
    // 204: don't waste bandwidth on a body the beacon won't read.
    return new NextResponse(null, { status: 204 });
  }

  let body: VitalsBody;
  try {
    body = (await req.json()) as VitalsBody;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // INFO level — Web Vitals are normal operational data, not errors.
  // Promtail's regex extractor sets level=INFO from the line below.
   
  console.info(
    JSON.stringify({
      level: 'INFO',
      kind: 'web_vitals',
      metric: body.metric,
      value: body.value,
      rating: body.rating,
      delta: body.delta,
      navigationType: body.navigationType,
      url: body.url,
      ts: body.ts ?? Date.now(),
    }),
  );

  // 204 for sendBeacon — no body needed.
  return new NextResponse(null, { status: 204 });
}
