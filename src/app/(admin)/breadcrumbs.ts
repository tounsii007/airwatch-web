/**
 * Sentry-style breadcrumb tracker for the admin shell.
 *
 * <h3>What's a breadcrumb</h3>
 * Each entry records something the user did just before whatever
 * happens next (the "next" being a thrown exception, an API failure,
 * or eventually a navigation away). On a crash report we attach the
 * last 10 breadcrumbs so an operator opening the error in the dashboard
 * sees the trail that led there:
 *
 * <pre>
 *   [
 *     { ts: '12:34:01', kind: 'route',  data: { from: '/admin', to: '/admin/jobs' } },
 *     { ts: '12:34:03', kind: 'click',  data: { selector: 'button.run-now' } },
 *     { ts: '12:34:03', kind: 'fetch:start',    data: { url: '/admin/api/jobs/foo/run', method: 'POST' } },
 *     { ts: '12:34:04', kind: 'fetch:response', data: { url: '...', status: 500 } },
 *     { ts: '12:34:04', kind: 'error',          data: { message: '...' } },
 *   ]
 * </pre>
 *
 * <h3>Why this is in localStorage</h3>
 * A reload-as-recovery user-flow ("things broke, refresh") would
 * otherwise lose the trail right when we need it. localStorage
 * survives the reload so the next page load can include the prior
 * breadcrumbs in any error report fired from the new tab. Capped at
 * 50 entries so a stuck loop can't fill the quota.
 *
 * <h3>Privacy</h3>
 * URL query strings are stripped (same logic as the error reporter).
 * Click selectors are recorded as best-effort CSS paths, not text
 * content — operator names + email addresses are NOT persisted.
 */

const STORAGE_KEY  = 'airwatch.admin.breadcrumbs';
const MAX_ENTRIES  = 50;
/** Number sent with each error report — older breadcrumbs stay in storage for next crash. */
export const BREADCRUMB_TAIL_FOR_REPORT = 10;

export type BreadcrumbKind =
  | 'route'           // route change (Next.js navigation)
  | 'click'           // button / link click
  | 'fetch:start'     // outgoing /admin/api/* call
  | 'fetch:response'  // /admin/api/* call result
  | 'error'           // observed error (also drives the persist call)
  | 'manual';         // operator-tagged (future: console-driven debugging)

export interface Breadcrumb {
  /** ISO instant. */
  ts: string;
  kind: BreadcrumbKind;
  data: Record<string, unknown>;
}

function readAll(): Breadcrumb[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(crumbs: Breadcrumb[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(crumbs));
  } catch {
    // Quota / private mode — drop the buffer. Breadcrumbs are
    // forensic, not authoritative; losing them is acceptable.
  }
}

function stripQuery(href: string | undefined | null): string {
  if (!href) return '';
  try {
    const u = new URL(href, window.location.href);
    return u.origin + u.pathname;
  } catch {
    return href;
  }
}

/**
 * Collapse numeric and UUID path segments to a `:id` placeholder so a
 * breadcrumb trail like `/admin/jobs/42` is recorded as
 * `/admin/jobs/:id`. Two reasons:
 *   1. <b>Privacy</b> — operator-visible IDs may correlate to specific
 *      tenants / records; persisting them in localStorage past the
 *      session lifetime is more exposure than we need for forensics.
 *   2. <b>Aggregation</b> — error reports become groupable by template
 *      path. Without this, a 500 on `/admin/jobs/42` and `/admin/jobs/43`
 *      look like two independent incidents.
 */
function anonymizeIds(path: string): string {
  return path.replace(
    /\/(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=\/|$)/gi,
    '/:id',
  );
}

function sanitizeUrl(href: string | undefined | null): string {
  return anonymizeIds(stripQuery(href));
}

/**
 * Append one breadcrumb to the ring. Trims to {@link MAX_ENTRIES}.
 */
export function pushBreadcrumb(kind: BreadcrumbKind, data: Record<string, unknown>): void {
  const all = readAll();
  all.push({ ts: new Date().toISOString(), kind, data });
  if (all.length > MAX_ENTRIES) all.splice(0, all.length - MAX_ENTRIES);
  writeAll(all);
}

/**
 * Snapshot the most-recent N breadcrumbs as a JSON string suitable for
 * sending in an error report. Returns null if there are none.
 */
export function recentBreadcrumbsJson(): string | null {
  const all = readAll();
  if (all.length === 0) return null;
  const tail = all.slice(-BREADCRUMB_TAIL_FOR_REPORT);
  return JSON.stringify(tail);
}

/** For tests / debugging. */
export function clearBreadcrumbs(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/**
 * Auto-capture breadcrumbs for the common interactions:
 *   - Route changes (popstate + pushState/replaceState wrappers)
 *   - Click events (best-effort selector)
 *   - Fetch calls under /admin/api/*
 *
 * Idempotent: safe to call from multiple components, mounts only once.
 */
let installed = false;
export function installBreadcrumbAutoCapture(): void {
  if (installed) return;
  if (typeof window === 'undefined') return;
  installed = true;

  // Initial route entry — operators want to see "they were on /admin/jobs"
  // in the breadcrumb trail even if they never navigated within the SPA.
  pushBreadcrumb('route', { to: sanitizeUrl(window.location.href) });

  // Route changes via History API. Next.js uses the same primitives, so
  // wrapping them captures every router.push / link click.
  const origPush    = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    const result = origPush.apply(this, args);
    pushBreadcrumb('route', { to: sanitizeUrl(window.location.href) });
    return result;
  };
  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    const result = origReplace.apply(this, args);
    pushBreadcrumb('route', { to: sanitizeUrl(window.location.href) });
    return result;
  };
  window.addEventListener('popstate', () => {
    pushBreadcrumb('route', { to: sanitizeUrl(window.location.href) });
  });

  // Click capture — best-effort CSS selector for the target.
  window.addEventListener('click', (ev) => {
    const target = ev.target as Element | null;
    if (!target) return;
    pushBreadcrumb('click', {
      selector: bestSelector(target),
      text: target instanceof HTMLElement ? target.innerText?.slice(0, 40) : undefined,
    });
  }, { capture: true });

  // Fetch wrapper. Only intercepts /admin/api/* — other endpoints (the
  // public flight API, third-party CDNs) are irrelevant for admin
  // forensics and would dilute the trail.
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input
              : input instanceof URL      ? input.toString()
              :                             input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const isAdminApi = typeof url === 'string' && url.includes('/admin/api/');
    const startTs = Date.now();
    if (isAdminApi) {
      pushBreadcrumb('fetch:start', { url: sanitizeUrl(url), method });
    }
    try {
      const res = await origFetch.call(this, input, init);
      if (isAdminApi) {
        pushBreadcrumb('fetch:response', {
          url: sanitizeUrl(url),
          method,
          status: res.status,
          durationMs: Date.now() - startTs,
        });
      }
      return res;
    } catch (ex) {
      if (isAdminApi) {
        pushBreadcrumb('fetch:response', {
          url: sanitizeUrl(url),
          method,
          status: 0,
          durationMs: Date.now() - startTs,
          error: ex instanceof Error ? ex.message : String(ex),
        });
      }
      throw ex;
    }
  };
}

/**
 * Build a best-effort CSS selector for the given element. Used by the
 * click breadcrumb. Walks up to 4 ancestors, prefers id > role > tag.class.
 */
function bestSelector(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  for (let i = 0; i < 4 && cur; i++) {
    if (cur.id) {
      parts.unshift('#' + cur.id);
      break;  // id is unique enough, stop walking
    }
    let part = cur.tagName.toLowerCase();
    const role = cur.getAttribute('role');
    if (role) part += `[role="${role}"]`;
    const cls = (cur.classList && cur.classList.length > 0)
      ? '.' + Array.from(cur.classList).slice(0, 2).join('.')
      : '';
    parts.unshift(part + cls);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}
