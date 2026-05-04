/**
 * Shared row shapes for the admin dashboard.
 *
 * These mirror the JSON payloads returned by the api side
 * /admin/api/monitoring/* endpoints. Kept here (a tiny isolated file)
 * so the section components don't all redeclare them and so the
 * page-level fetcher can return a single typed bundle.
 */

export interface PortRow {
  port_name: string;
  host: string;
  port_number: number;
  up: boolean;
  latency_ms: number | null;
  error_msg: string | null;
  probed_at: string;
}

export interface BlockedIp {
  ip: string;
  country_code: string | null;
  attempt_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_path: string | null;
  last_user_agent: string | null;
}

export interface RejectEvent {
  id: number;
  occurred_at: string;
  ip: string;
  country_code: string | null;
  method: string;
  path: string;
  reason: string;
  user_agent: string | null;
}

export interface PortHistoryPoint {
  probed_at: string;
  up: boolean;
  latency_ms: number | null;
  error_msg: string | null;
}

/** A {@link PortRow} augmented with its 60-minute latency trail —
 *  produced by {@link fetchDashboardData} so the PortGrid can render
 *  per-port sparklines without doing the round-trip itself.
 *
 *  `historyPoints` keeps the full {timestamp, latency} pairs so the
 *  tile can show "max 47 ms at 14:23, min 0 ms at 14:50" alongside
 *  the sparkline. `history` (numbers only) is kept for backward-
 *  compat with charts that only need the y-values. */
export type PortRowWithHistory = PortRow & {
  history: number[];
  historyPoints: Array<{ t: number; v: number; up: boolean }>;
};
