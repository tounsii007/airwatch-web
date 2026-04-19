import { checkRateLimit, recordRateLimitHit } from '@/lib/rateLimiter';
import { getAuthHeaders } from '@/lib/apiSecurity';

/**
 * Wrapper around fetch() for API calls.
 *
 * Responsibilities:
 *   1. Gate — consult the client-side rate limiter before making the call.
 *      Returns a synthetic 429 response when backoff is active, so callers
 *      can treat it like any other HTTP error.
 *   2. Auth — attach HMAC headers when {@code NEXT_PUBLIC_API_SECRET} is set.
 *   3. Logging — expected upstream back-pressure (rate limits, monthly quota
 *      exceeded) goes to `console.warn` so the Next.js dev-overlay doesn't
 *      flag it as an "Issue" and leak memory on every poll; real errors
 *      (5xx, auth) stay at `console.error`.
 *   4. Record — every rate-limit hit feeds the backoff counter so the gate
 *      gets tighter on repeat offenders.
 */

type Severity = 'warn' | 'error';

function emit(severity: Severity, message: string) {
  if (severity === 'warn') console.warn(message);
  else console.error(message);
}

function pathOf(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '');
}

function ratelimitResponse(retryAfterMs: number): Response {
  const body = JSON.stringify({
    error: {
      code: 'rate_limit_paused',
      message: `Rate limited — retrying in ${Math.ceil(retryAfterMs / 1000)}s`,
    },
  });
  return new Response(body, {
    status: 429,
    headers: { 'content-type': 'application/json', 'retry-after': String(Math.ceil(retryAfterMs / 1000)) },
  });
}

function classifyHttpStatus(status: number): { severity: Severity; label: string } {
  if (status === 429) return { severity: 'warn', label: `RATE LIMITED (429)` };
  if (status === 401 || status === 403) return { severity: 'error', label: `AUTH ERROR (${status}) — Check API key` };
  if (status >= 500) return { severity: 'error', label: `SERVER ERROR (${status})` };
  return { severity: 'error', label: `ERROR (${status})` };
}

function classifyAirlabsCode(code: string): { severity: Severity; label: string } {
  if (code === 'month_limit_exceeded') return { severity: 'warn', label: 'MONTHLY LIMIT EXCEEDED' };
  if (code === 'hour_limit_exceeded' || code === 'minute_limit_exceeded') return { severity: 'warn', label: 'RATE LIMIT' };
  if (code.includes('key') || code.includes('auth')) return { severity: 'error', label: 'API KEY ERROR' };
  return { severity: 'error', label: `ERROR [${code}]` };
}

async function parseAirlabsError(res: Response): Promise<{ code: string; message: string } | null> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  try {
    const data = await res.clone().json();
    if (!data?.error) return null;
    return { code: data.error.code ?? 'unknown', message: data.error.message ?? 'Unknown API error' };
  } catch {
    return null;
  }
}

function isRateLimitCode(code: string): boolean {
  return code === 'month_limit_exceeded' || code === 'hour_limit_exceeded' || code === 'minute_limit_exceeded';
}

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const path = pathOf(url);

  // 1. Rate-limit gate — don't even try if we're in cooldown.
  const gate = checkRateLimit();
  if (!gate.allowed) return ratelimitResponse(gate.retryAfterMs);

  // 2. HMAC auth (no-op when NEXT_PUBLIC_API_SECRET is unset).
  const authHeaders = await getAuthHeaders(path);
  const mergedHeaders = { ...(options?.headers ?? {}), ...authHeaders };
  const res = await fetch(url, { ...options, headers: mergedHeaders });

  // 3. HTTP-level failure — log at the right severity.
  if (!res.ok) {
    const { severity, label } = classifyHttpStatus(res.status);
    emit(severity, `[AirWatch API] ${label} — ${path}`);
    if (res.status === 429) recordRateLimitHit('http_429');
    return res;
  }

  // 4. Airlabs quirk: 200 OK with an error envelope in the JSON body.
  const airlabsError = await parseAirlabsError(res);
  if (airlabsError) {
    const { severity, label } = classifyAirlabsCode(airlabsError.code);
    emit(severity, `[AirWatch API] ${label} — ${airlabsError.message} — ${path}`);
    if (isRateLimitCode(airlabsError.code)) recordRateLimitHit(airlabsError.code);
  }

  return res;
}
