/**
 * Zod schemas for the {@code /admin/api/*} payloads consumed by the admin UI.
 *
 * <h3>Why a separate file from {@code src/lib/schemas.ts}</h3>
 * The public-shell schemas in {@code src/lib/schemas.ts} are bundled into
 * the public route group; admin payload shapes have no business shipping
 * to anonymous map visitors. Keeping the admin schemas under
 * {@code (admin)/} ensures Next.js route-group code-splitting drops them
 * from the public bundle.
 *
 * <h3>Coverage policy</h3>
 *   * Schemas exist for every payload the admin shell renders rows from
 *     (tables, panels, charts) — a backend rename or a column drop must
 *     surface as a parse failure with a stack frame, not a silent
 *     {@code undefined}.
 *   * Endpoints that return a fire-and-forget {@code {ok:true}} or 204
 *     are NOT schematised; their shape is trivial and the cost of a
 *     missing one is bounded.
 *
 * <h3>Helpers</h3>
 * Re-uses {@link safeParse} / {@link safeParseArray} from
 * {@code @/lib/schemas} — same semantics: log + drop bad rows, never
 * throw.
 */

import { z } from 'zod';

// ─── /monitoring/ports ──────────────────────────────────────────────────────
export const PortRowSchema = z.object({
  port_name:   z.string(),
  host:        z.string(),
  port_number: z.number().int(),
  up:          z.boolean(),
  latency_ms:  z.number().int().nullable(),
  error_msg:   z.string().nullable(),
  probed_at:   z.string(), // ISO instant
});
export type PortRow = z.infer<typeof PortRowSchema>;

// ─── /monitoring/ports/{name}/history (per-port) ────────────────────────────
export const PortHistoryPointSchema = z.object({
  probed_at:  z.string(),
  up:         z.boolean(),
  latency_ms: z.number().int().nullable(),
  error_msg:  z.string().nullable(),
});
export type PortHistoryPoint = z.infer<typeof PortHistoryPointSchema>;

// ─── /monitoring/ports/history (batched) ────────────────────────────────────
// Map of port_name -> list of history points.
export const PortHistoryBatchSchema = z.record(z.string(), z.array(PortHistoryPointSchema));
export type PortHistoryBatch = z.infer<typeof PortHistoryBatchSchema>;

// ─── /monitoring/unauthorized-ips ───────────────────────────────────────────
export const BlockedIpSchema = z.object({
  ip:               z.string(),
  country_code:     z.string().nullable(),
  attempt_count:    z.number().int(),
  first_seen_at:    z.string(),
  last_seen_at:     z.string(),
  last_path:        z.string().nullable(),
  last_user_agent:  z.string().nullable(),
});
export type BlockedIp = z.infer<typeof BlockedIpSchema>;

// ─── /monitoring/unauthorized-events ────────────────────────────────────────
export const RejectEventSchema = z.object({
  id:           z.number().int(),
  occurred_at:  z.string(),
  ip:           z.string(),
  country_code: z.string().nullable(),
  method:       z.string(),
  path:         z.string(),
  reason:       z.string(),
  user_agent:   z.string().nullable(),
});
export type RejectEvent = z.infer<typeof RejectEventSchema>;

// ─── /monitoring/critical-errors ────────────────────────────────────────────
export const CriticalErrorEntrySchema = z.object({
  ts:        z.string(),
  level:     z.string(),
  logger:    z.string(),
  message:   z.string(),
  signature: z.string(),
  throwable: z.string().nullable(),
});
export type CriticalErrorEntry = z.infer<typeof CriticalErrorEntrySchema>;

export const CriticalErrorPayloadSchema = z.object({
  totalSeen: z.number().int(),
  buffered:  z.number().int(),
  entries:   z.array(CriticalErrorEntrySchema),
});
export type CriticalErrorPayload = z.infer<typeof CriticalErrorPayloadSchema>;

// ─── /frontend-errors  (live)  +  /persisted ────────────────────────────────
export const FrontendErrorEntrySchema = z.object({
  id:               z.number().int(),
  // Live mode populates {firstSeen, lastSeen, count}; persisted mode populates
  // {occurredAt, lastSeenAt, occurrenceCount}. Both are accepted so the
  // toggle in <FrontendErrorsCard /> doesn't need two parsers.
  firstSeen:        z.string().optional(),
  occurredAt:       z.string().optional(),
  lastSeen:         z.string().optional(),
  lastSeenAt:       z.string().optional(),
  count:            z.number().int().optional(),
  occurrenceCount:  z.number().int().optional(),
  signature:        z.string(),
  message:          z.string(),
  stack:            z.string().nullable(),
  url:              z.string().nullable(),
  userAgent:        z.string().nullable(),
  username:         z.string().nullable(),
  releaseTag:       z.string().nullable().optional(),
  sessionId:        z.string().nullable().optional(),
  breadcrumbs:      z.string().nullable().optional(),
});
export type FrontendErrorEntry = z.infer<typeof FrontendErrorEntrySchema>;

export const FrontendErrorLivePayloadSchema = z.object({
  total:    z.number().int(),
  buffered: z.number().int(),
  entries:  z.array(FrontendErrorEntrySchema),
});
export type FrontendErrorLivePayload = z.infer<typeof FrontendErrorLivePayloadSchema>;

export const FrontendErrorPersistedPayloadSchema = z.object({
  limit:   z.number().int(),
  entries: z.array(FrontendErrorEntrySchema),
});
export type FrontendErrorPersistedPayload = z.infer<typeof FrontendErrorPersistedPayloadSchema>;

// ─── /monitoring/db-replication ─────────────────────────────────────────────
export const ReplicationStatusSchema = z.object({
  is_primary:           z.boolean(),
  replicas:             z.array(z.object({
    application_name: z.string(),
    client_addr:      z.string().nullable(),
    state:            z.string(),
    sync_state:       z.string(),
    write_lag_ms:     z.number().nullable(),
    flush_lag_ms:     z.number().nullable(),
    replay_lag_ms:    z.number().nullable(),
  })),
  measured_at:          z.string(),
});
export type ReplicationStatus = z.infer<typeof ReplicationStatusSchema>;

// ─── /monitoring/alerts/grouped ─────────────────────────────────────────────
export const AlertGroupSchema = z.object({
  fingerprint:  z.string(),
  kind:         z.string(),
  severity:     z.string(),
  target:       z.string(),
  count:        z.number().int(),
  first_fired:  z.string(),
  last_fired:   z.string(),
  acknowledged: z.boolean(),
  muted_until:  z.string().nullable(),
  incident_id:  z.number().int().nullable(),
});
export type AlertGroup = z.infer<typeof AlertGroupSchema>;

// ─── /webhooks ──────────────────────────────────────────────────────────────
export const WebhookSchema = z.object({
  id:                z.number().int(),
  name:              z.string(),
  url:               z.string(),
  enabled:           z.boolean(),
  filter_kind:       z.string().nullable(),
  filter_severity:   z.string().nullable(),
  filter_target:     z.string().nullable(),
  total_deliveries:  z.number().int(),
  failed_deliveries: z.number().int(),
  last_delivered_at: z.string().nullable(),
  created_at:        z.string(),
});
export type Webhook = z.infer<typeof WebhookSchema>;

// ─── /csrf ──────────────────────────────────────────────────────────────────
export const CsrfTokenSchema = z.object({
  token:     z.string(),
  available: z.boolean(),
});
export type CsrfToken = z.infer<typeof CsrfTokenSchema>;
