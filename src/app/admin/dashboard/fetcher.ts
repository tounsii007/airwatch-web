/**
 * Server-side data layer for the admin dashboard page.
 *
 * The page is a server component, so all its data is fetched once
 * during the render. Centralising the calls here keeps the page-level
 * orchestrator focused on layout and lets us add caching / telemetry
 * around the network layer without touching every section file.
 */

import type {
  BlockedIp,
  PortHistoryPoint,
  PortRow,
  PortRowWithHistory,
  RejectEvent,
} from '@/app/admin/dashboard/types';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://nginx:18080';

/**
 * GET wrapper — never throws. Returns null on any failure (404, 500,
 * network blip, malformed JSON). The callers tolerate null and the
 * page renders graceful "API unreachable" states for each section
 * separately, so a single broken endpoint doesn't blank the whole
 * dashboard.
 */
export async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
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
        return {
          ...p,
          history: (hist ?? []).map((h) => h.latency_ms ?? 0),
        };
      }),
    );
  }

  return { ports, portsWithHistory, blocked, recent };
}
