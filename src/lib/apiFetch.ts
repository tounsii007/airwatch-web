/**
 * Wrapper around fetch() for API calls.
 * Logs errors (rate limits, auth failures, server errors) to the console
 * so they're visible in both browser devtools and server terminal.
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);

  // Log non-OK responses
  if (!res.ok) {
    const status = res.status;
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (status === 429) {
      console.error(`[AirWatch API] RATE LIMITED (429) — ${path}`);
    } else if (status >= 500) {
      console.error(`[AirWatch API] SERVER ERROR (${status}) — ${path}`);
    } else if (status === 401 || status === 403) {
      console.error(`[AirWatch API] AUTH ERROR (${status}) — ${path} — Check API key`);
    } else {
      console.error(`[AirWatch API] ERROR (${status}) — ${path}`);
    }
    return res;
  }

  // Check response body for Airlabs-specific errors (they return 200 with error in JSON)
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const cloned = res.clone();
    try {
      const data = await cloned.json();
      if (data?.error) {
        const code = data.error.code ?? 'unknown';
        const msg = data.error.message ?? 'Unknown API error';
        const path = url.replace(/^https?:\/\/[^/]+/, '');
        if (code === 'month_limit_exceeded') {
          console.error(`[AirWatch API] MONTHLY LIMIT EXCEEDED — ${msg} — ${path}`);
        } else if (code === 'hour_limit_exceeded' || code === 'minute_limit_exceeded') {
          console.error(`[AirWatch API] RATE LIMIT — ${msg} — ${path}`);
        } else if (code.includes('key') || code.includes('auth')) {
          console.error(`[AirWatch API] API KEY ERROR — ${msg} — ${path}`);
        } else {
          console.error(`[AirWatch API] ERROR [${code}] — ${msg} — ${path}`);
        }
      }
    } catch {
      // JSON parse failed — ignore, original response is still intact
    }
  }

  return res;
}
