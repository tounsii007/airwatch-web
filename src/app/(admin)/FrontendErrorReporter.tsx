/**
 * Captures uncaught JS exceptions + unhandled promise rejections in the
 * admin shell and POSTs them to {@code /admin/api/frontend-errors}. (Phase 3.1+)
 *
 * <h3>What's reported</h3>
 *   * window.onerror — synchronous throws inside event handlers, scripts
 *   * unhandledrejection — promises that were never .catch()'d
 *
 * <h3>Phase 3.1+ extensions (V13)</h3>
 *   * <b>Breadcrumbs</b> — last 10 user actions before the throw, captured
 *     by {@link installBreadcrumbAutoCapture} (route changes, clicks,
 *     /admin/api/* fetches). Persisted in localStorage so a refresh-as-
 *     recovery flow doesn't lose the trail.
 *   * <b>Release tag</b> — {@code NEXT_PUBLIC_RELEASE_TAG} baked in at
 *     build time. Defaults to "dev" in unbaked development. Lets the
 *     operator say "this only happens since 2026-05-04" with confidence.
 *   * <b>Session id</b> — per-tab nonce stored in {@code sessionStorage}.
 *     Joinable backend-side with {@code admin_audit_log} on
 *     (username, occurredAt ± 30s) for backend↔frontend correlation.
 *   * <b>Persistence</b> — backend now writes each report to
 *     {@code admin_frontend_error}, so an api restart no longer loses
 *     the operator's investigation context.
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
 * The admin shell is small enough that a persisted ring on the api
 * is the right tool.
 */
'use client';

import { useEffect } from 'react';
import { installBreadcrumbAutoCapture, pushBreadcrumb, recentBreadcrumbsJson } from '@/app/(admin)/breadcrumbs';
import { resolveStackTrace } from '@/app/(admin)/sourceMapResolver';

const ENDPOINT = '/admin/api/frontend-errors';
/** Per-tab dedup so a fast loop doesn't DDoS the api. */
const RECENT_WINDOW_MS = 5_000;
const recentlySent = new Map<string, number>();

const SESSION_ID_KEY = 'airwatch.admin.session-nonce';

/** Persist a per-tab session id. New each tab open; survives within tab. */
function getOrInitSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      // 16 hex chars = 64 bits of randomness — enough to make collisions
      // across the operator fleet vanishingly unlikely. Math.random is
      // fine here; we're not protecting anything sensitive, just
      // joining records.
      id = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function getReleaseTag(): string {
  // process.env values prefixed with NEXT_PUBLIC_ are baked into the
  // client bundle by Next.js at build time. Fallback "dev" so an
  // unconfigured local build still produces meaningful payloads.
  return process.env.NEXT_PUBLIC_RELEASE_TAG || 'dev';
}

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
  // Drop a final breadcrumb so the trail captures the error itself —
  // operator opening the persisted record sees the explosion and the
  // few preceding actions in one continuous timeline.
  pushBreadcrumb('error', { message: message.slice(0, 200) });

  // Phase 3 — resolve the minified stack against shipped .js.map files
  // BEFORE POSTing. The resolver caches per-URL consumers so the cost
  // is paid once per chunk per page lifetime. We send the de-mangled
  // stack as the primary `stack` field; if resolution failed any frame
  // stays raw — never empty.
  const resolvedStack = await resolveStackTrace(stack);

  try {
    const params = new URLSearchParams();
    params.set('message', message);
    if (resolvedStack) params.set('stack', resolvedStack);
    params.set('url',       stripQuery(window.location.href));
    params.set('userAgent', navigator.userAgent);
    params.set('releaseTag', getReleaseTag());
    const sessionId = getOrInitSessionId();
    if (sessionId) params.set('sessionId', sessionId);
    const breadcrumbs = recentBreadcrumbsJson();
    if (breadcrumbs) params.set('breadcrumbs', breadcrumbs);
    // No CSRF — the endpoint accepts anonymous reports (we want to
    // capture errors that THEMSELVES might be auth-related). The api-side
    // ring + DB are bounded, so abuse risk is contained.
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
    // Auto-capture breadcrumbs (route, click, fetch). Idempotent.
    installBreadcrumbAutoCapture();

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
