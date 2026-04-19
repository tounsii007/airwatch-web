/**
 * Wrapper around fetch() for API calls.
 *
 * Logging policy:
 *   - Expected upstream back-pressure (rate limits, monthly quota exceeded) →
 *     `console.warn`. These are normal operational states; we don't want the
 *     Next.js dev-overlay flagging them as "Issues" every time the backend
 *     tells us to back off.
 *   - Real errors (5xx, auth failures, unknown failure modes) → `console.error`.
 */

type ErrorSeverity = 'warn' | 'error';

function pathOf(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '');
}

function emit(severity: ErrorSeverity, message: string) {
  if (severity === 'warn') console.warn(message);
  else console.error(message);
}

function classifyHttpStatus(status: number): { severity: ErrorSeverity; label: string } {
  if (status === 429) return { severity: 'warn', label: `RATE LIMITED (429)` };
  if (status === 401 || status === 403) return { severity: 'error', label: `AUTH ERROR (${status}) — Check API key` };
  if (status >= 500) return { severity: 'error', label: `SERVER ERROR (${status})` };
  return { severity: 'error', label: `ERROR (${status})` };
}

function classifyAirlabsCode(code: string): { severity: ErrorSeverity; label: string } {
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

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);

  if (!res.ok) {
    const { severity, label } = classifyHttpStatus(res.status);
    emit(severity, `[AirWatch API] ${label} — ${pathOf(url)}`);
    return res;
  }

  const airlabsError = await parseAirlabsError(res);
  if (airlabsError) {
    const { severity, label } = classifyAirlabsCode(airlabsError.code);
    emit(severity, `[AirWatch API] ${label} — ${airlabsError.message} — ${pathOf(url)}`);
  }

  return res;
}
