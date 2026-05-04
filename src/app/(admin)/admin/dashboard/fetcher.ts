/**
 * Server-side data layer for the admin dashboard page.
 *
 * The page is a server component, so all its data is fetched once
 * during the render. Centralising the calls here keeps the page-level
 * orchestrator focused on layout and lets us add caching / telemetry
 * around the network layer without touching every section file.
 */

import { cookies } from 'next/headers';
import type {
  BlockedIp,
  PortHistoryPoint,
  PortRow,
  PortRowWithHistory,
  RejectEvent,
} from '@/app/(admin)/admin/dashboard/types';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://nginx:18080';

/**
 * GET wrapper — never throws. Returns null on any failure (401, 404,
 * 500, network blip, malformed JSON). Forwards the user's incoming
 * cookies so AdminAuthFilter accepts the request — without this the
 * server-side fetch hits the api with no session and gets a 401.
 *
 * The callers tolerate null and the page renders graceful "API
 * unreachable" states for each section separately, so a single broken
 * endpoint doesn't blank the whole dashboard.
 */
export async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
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
  const payload = await fetchJson<{ token: string; available: boolean }>('/admin/api/csrf');
  return payload?.token ?? '';
}

/** Aggregate bundle returned to the page-level orchestrator. */
export interface DashboardData {
  ports: PortRow[] | null;
  portsWithHistory: PortRowWithHistory[];
  blocked: BlockedIp[] | null;
  recent: RejectEvent[] | null;
}

/**
 * Fetch every payload the dashboard needs in parallel, then enrich each
 * port row with its 60-minute latency history (one extra round-trip per
 * port — chatty but each response is tiny). A future Phase-3 endpoint
 * will batch the histories into a single response if this becomes the
 * slow part of the render.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const [ports, blocked, recent] = await Promise.all([
    fetchJson<PortRow[]>('/admin/api/monitoring/ports'),
    fetchJson<BlockedIp[]>('/admin/api/monitoring/unauthorized-ips?limit=10'),
    fetchJson<RejectEvent[]>('/admin/api/monitoring/unauthorized-events?limit=30'),
  ]);

  let portsWithHistory: PortRowWithHistory[] = [];
  if (ports) {
    portsWithHistory = await Promise.all(
      ports.map(async (p) => {
        const hist = await fetchJson<PortHistoryPoint[]>(
          `/admin/api/monitoring/ports/${encodeURIComponent(p.port_name)}/history?minutes=60`,
        );
        const points = (hist ?? []).map((h) => ({
          t: new Date(h.probed_at).getTime(),
          v: h.latency_ms ?? 0,
          up: h.up,
        }));
        return {
          ...p,
          history: points.map((pt) => pt.v),
          historyPoints: points,
        };
      }),
    );
  }

  return { ports, portsWithHistory, blocked, recent };
}
