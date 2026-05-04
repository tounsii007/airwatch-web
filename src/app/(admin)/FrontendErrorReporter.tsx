/**
 * Captures uncaught JS exceptions + unhandled promise rejections in the
 * admin shell and POSTs them to {@code /admin/api/frontend-errors}. (Phase 3.1)
 *
 * <h3>What's reported</h3>
 *   * window.onerror — synchronous throws inside event handlers, scripts
 *   * unhandledrejection — promises that were never .catch()'d
 *
 * <h3>What's filtered</h3>
 *   * Empty / "Script error." messages (cross-origin script errors give
 *     us nothing useful — Sentry filters these too)
 *   * URL query strings (may contain CSRF tokens or ?error=… params)
 *   * The reporter's own posts (avoid feedback loops)
 *
 * <h3>Why mounted in the admin layout, not the public app</h3>
 * The public app doesn't have an authenticated reporting channel — its
 * errors should go to a real Sentry-style service (Phase 3 deferred).
 * The admin shell is small enough that an in-memory ring on the api
 * is the right tool.
 */
'use client';

import { useEffect } from 'react';

const ENDPOINT = '/admin/api/frontend-errors';
/** Per-tab dedup so a fast loop doesn't DDoS the api. */
const RECENT_WINDOW_MS = 5_000;
const recentlySent = new Map<string, number>();

function stripQuery(href: string): string {
  try {
    const u = new URL(href);
    return u.origin + u.pathname;
  } catch {
    return href;
  }
}

function shouldReport(message: string): boolean {
  if (!message) return false;
  // CORS-stripped message — useless. Sentry, Bugsnag, etc. all drop these.
  if (message === 'Script error.' || message === 'ResizeObserver loop limit exceeded') return false;
  // Dedup
  const last = recentlySent.get(message);
  const now = Date.now();
  if (last !== undefined && now - last < RECENT_WINDOW_MS) return false;
  recentlySent.set(message, now);
  // Periodically prune the dedup map.
  if (recentlySent.size > 200) {
    for (const [k, v] of recentlySent) {
      if (now - v > RECENT_WINDOW_MS * 4) recentlySent.delete(k);
    }
  }
  return true;
}

async function send(message: string, stack: string | undefined) {
  if (!shouldReport(message)) return;
  try {
    const params = new URLSearchParams();
    params.set('message', message);
    if (stack)             params.set('stack', stack);
    params.set('url',      stripQuery(window.location.href));
    params.set('userAgent', navigator.userAgent);
    // No CSRF — the endpoint accepts anonymous reports (we want to
    // capture errors that THEMSELVES might be auth-related). The api-side
    // ring buffer is bounded, so abuse risk is contained.
    await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      // keepalive lets the request survive a navigation — important for
      // errors thrown during a page transition.
      keepalive: true,
    });
  } catch {
    // Reporting failure — swallow. We can't error-on-error.
  }
}

export function FrontendErrorReporter() {
  useEffect(() => {
    function onError(ev: ErrorEvent) {
      const msg = ev.message || String(ev.error?.message ?? 'unknown error');
      void send(msg, ev.error?.stack);
    }
    function onRejection(ev: PromiseRejectionEvent) {
      const reason: unknown = ev.reason;
      const msg =
        reason instanceof Error ? reason.message :
        typeof reason === 'string' ? reason :
        'unhandled promise rejection';
      const stack = reason instanceof Error ? reason.stack : undefined;
      void send(msg, stack);
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
