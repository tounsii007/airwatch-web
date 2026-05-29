/**
 * Server-side data layer for the admin dashboard page.
 *
 * The page is a server component, so all its data is fetched once
 * during the render. Centralising the calls here keeps the page-level
 * orchestrator focused on layout and lets us add caching / telemetry
 * around the network layer without touching every section file.
 */

import { cookies } from 'next/headers';
import { safeParse, safeParseArray } from '@/lib/schemas';
import {
  BlockedIpSchema,
  CsrfTokenSchema,
  PortHistoryBatchSchema,
  PortRowSchema,
  RejectEventSchema,
} from '@/app/(admin)/adminSchemas';
import type {
  BlockedIp,
  PortHistoryPoint,
  PortRow,
  PortRowWithHistory,
  RejectEvent,
} from '@/app/(admin)/admin/dashboard/types';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://nginx:18080';

// Defense-in-depth: INTERNAL_API_URL gets used as a fetch() base for
// every server-side admin call. If a misconfigured deploy injected an
// externally-reachable URL here, our forwarded cookies (incl. session +
// CSRF) would leak to the wrong origin. Allowlist the in-cluster hosts;
// outside of production we tolerate anything so local rigs keep working.
const ALLOWED_INTERNAL_HOSTS = /^(http:\/\/(nginx|localhost|127\.0\.0\.1)(:\d+)?)$/;
if (process.env.NODE_ENV === 'production' && !ALLOWED_INTERNAL_HOSTS.test(INTERNAL_API_URL.replace(/\/$/, ''))) {
  console.warn('INTERNAL_API_URL has an unexpected host:', INTERNAL_API_URL);
}

/**
 * Cookie-Whitelist: nur diese Cookies werden beim Server-Side-Fetch an das
 * Backend weitergereicht. Verhindert Privacy-Leaks (z.B. Analytics-Cookies
 * landen sonst in Backend-Logs) und reduziert Request-Smuggling-Restrisiko
 * bei bösartig konstruierten Cookie-Werten Dritter.
 *
 * Strikte 2-Namen-Liste statt früherer AIRWATCH_*-Präfix-Heuristik: ein
 * versehentlich später eingeführtes AIRWATCH_TRACKING (o.ä.) würde sonst
 * stillschweigend ans Backend leaken. Neue Cookies müssen hier explizit
 * eingetragen werden — bewusste Hürde, kein Versehen.
 */
const FORWARDED_COOKIES = new Set(['AIRWATCH_ADMIN_SID', 'XSRF-TOKEN']);

function buildForwardedCookieHeader(all: { name: string; value: string }[]): string {
  return all
    .filter((c) => FORWARDED_COOKIES.has(c.name))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * GET wrapper — never throws. Returns null on any failure (401, 404,
 * 500, network blip, malformed JSON). Forwards a *whitelisted* subset of
 * the user's incoming cookies (Session + CSRF token) so AdminAuthFilter
 * accepts the request — without this the server-side fetch hits the api
 * with no session and gets a 401.
 *
 * The callers tolerate null and the page renders graceful "API
 * unreachable" states for each section separately, so a single broken
 * endpoint doesn't blank the whole dashboard.
 */
export async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = buildForwardedCookieHeader(cookieStore.getAll());
    const res = await fetch(`${INTERNAL_API_URL}${path}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch the current session's CSRF token. Used by action pages that
 * render <form method="post"> with a hidden _csrf input — the form
 * POSTs straight to a Spring Boot endpoint, which validates the token
 * against the same value held in the user's session.
 *
 * Returns empty string if no session / no token; the caller should
 * disable submit buttons in that case rather than render a broken form.
 */
export async function fetchCsrfToken(): Promise<string> {
  const raw = await fetchJson<unknown>('/admin/api/csrf');
  const parsed = safeParse(CsrfTokenSchema, raw, 'csrf');
  return parsed?.token ?? '';
}

/** Aggregate bundle returned to the page-level orchestrator. */
export interface DashboardData {
  ports: PortRow[] | null;
  portsWithHistory: PortRowWithHistory[];
  blocked: BlockedIp[] | null;
  recent: RejectEvent[] | null;
}

/**
 * Fetch every payload the dashboard needs in parallel.
 *
 * <p>Per-port history used to be one fetch per port (chatty: 12+
 * round-trips on cold render). It's now a single batched call to
 * {@code /monitoring/ports/history}. The endpoint returns a map keyed
 * by port name; we splice it back onto the port rows here so the
 * shape consumed by the dashboard sections doesn't change.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const [rawPorts, rawHistories, rawBlocked, rawRecent] = await Promise.all([
    fetchJson<unknown>('/admin/api/monitoring/ports'),
    fetchJson<unknown>('/admin/api/monitoring/ports/history?minutes=60'),
    fetchJson<unknown>('/admin/api/monitoring/unauthorized-ips?limit=10'),
    fetchJson<unknown>('/admin/api/monitoring/unauthorized-events?limit=30'),
  ]);

  // Schema validation at the boundary. Bad rows get dropped with a console
  // warning; the page still renders for the rest. Returning null on
  // unreachable / 401 (fetchJson convention) is preserved.
  const ports: PortRow[] | null = rawPorts == null
    ? null
    : safeParseArray(PortRowSchema, rawPorts, 'monitoring/ports').items;
  const histories = safeParse(PortHistoryBatchSchema, rawHistories ?? {}, 'monitoring/ports/history');
  const blocked: BlockedIp[] | null = rawBlocked == null
    ? null
    : safeParseArray(BlockedIpSchema, rawBlocked, 'monitoring/unauthorized-ips').items;
  const recent: RejectEvent[] | null = rawRecent == null
    ? null
    : safeParseArray(RejectEventSchema, rawRecent, 'monitoring/unauthorized-events').items;

  let portsWithHistory: PortRowWithHistory[] = [];
  if (ports) {
    portsWithHistory = ports.map((p) => {
      const hist: PortHistoryPoint[] = histories?.[p.port_name] ?? [];
      const points = hist.map((h) => ({
        t: new Date(h.probed_at).getTime(),
        v: h.latency_ms ?? 0,
        up: h.up,
      }));
      return {
        ...p,
        history: points.map((pt) => pt.v),
        historyPoints: points,
      };
    });
  }

  return { ports, portsWithHistory, blocked, recent };
}
