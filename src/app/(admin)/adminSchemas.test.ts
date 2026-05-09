// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { safeParse, safeParseArray } from '@/lib/schemas';
import {
  AlertGroupSchema,
  BlockedIpSchema,
  CriticalErrorPayloadSchema,
  CsrfTokenSchema,
  FrontendErrorEntrySchema,
  PortHistoryBatchSchema,
  PortRowSchema,
  RejectEventSchema,
  ReplicationStatusSchema,
  WebhookSchema,
} from './adminSchemas';

describe('admin API schemas', () => {
  describe('PortRowSchema', () => {
    it('accepts a healthy port row', () => {
      const r = PortRowSchema.safeParse({
        port_name: 'api', host: 'api', port_number: 18080,
        up: true, latency_ms: 12, error_msg: null,
        probed_at: '2026-05-09T12:00:00Z',
      });
      expect(r.success).toBe(true);
    });

    it('accepts a down row with null latency + error message', () => {
      const r = PortRowSchema.safeParse({
        port_name: 'pg', host: 'db', port_number: 5432,
        up: false, latency_ms: null, error_msg: 'timeout',
        probed_at: '2026-05-09T12:00:00Z',
      });
      expect(r.success).toBe(true);
    });

    it('rejects when up is missing', () => {
      const r = PortRowSchema.safeParse({
        port_name: 'api', host: 'api', port_number: 18080,
        latency_ms: 12, error_msg: null, probed_at: '2026-05-09T12:00:00Z',
      });
      expect(r.success).toBe(false);
    });
  });

  describe('PortHistoryBatchSchema', () => {
    it('accepts a map of port_name -> history points', () => {
      const r = PortHistoryBatchSchema.safeParse({
        api: [
          { probed_at: '2026-05-09T12:00:00Z', up: true, latency_ms: 10, error_msg: null },
        ],
        postgres: [],
      });
      expect(r.success).toBe(true);
    });

    it('rejects when an inner row is malformed', () => {
      const r = PortHistoryBatchSchema.safeParse({
        api: [{ probed_at: 'oops', up: 'maybe', latency_ms: 10, error_msg: null }],
      });
      expect(r.success).toBe(false);
    });
  });

  describe('BlockedIpSchema + RejectEventSchema', () => {
    it('parses a blocked IP with country_code populated by GeoIP', () => {
      const ok = BlockedIpSchema.safeParse({
        ip: '1.2.3.4', country_code: 'DE', attempt_count: 7,
        first_seen_at: '2026-05-09T11:00:00Z',
        last_seen_at:  '2026-05-09T12:00:00Z',
        last_path: '/admin', last_user_agent: 'curl/8.4.0',
      });
      expect(ok.success).toBe(true);
    });

    it('parses a blocked IP with country_code null (no .mmdb match)', () => {
      const ok = BlockedIpSchema.safeParse({
        ip: '10.0.0.1', country_code: null, attempt_count: 1,
        first_seen_at: '2026-05-09T11:00:00Z',
        last_seen_at:  '2026-05-09T12:00:00Z',
        last_path: null, last_user_agent: null,
      });
      expect(ok.success).toBe(true);
    });

    it('drops malformed reject-event rows in safeParseArray, keeps the good ones', () => {
      const out = safeParseArray(RejectEventSchema, [
        {
          id: 1, occurred_at: '2026-05-09T12:00:00Z', ip: '1.2.3.4',
          country_code: 'US', method: 'POST', path: '/admin/login', reason: 'bad_hmac',
          user_agent: 'curl', // good
        },
        { id: 'oops' /* bad */ },
      ], 'reject-events');
      expect(out.items).toHaveLength(1);
      expect(out.dropped).toBe(1);
    });
  });

  describe('CriticalErrorPayloadSchema', () => {
    it('accepts an empty buffer envelope', () => {
      const r = CriticalErrorPayloadSchema.safeParse({ totalSeen: 0, buffered: 0, entries: [] });
      expect(r.success).toBe(true);
    });

    it('rejects when entries is not an array', () => {
      const r = CriticalErrorPayloadSchema.safeParse({ totalSeen: 0, buffered: 0, entries: 'nope' });
      expect(r.success).toBe(false);
    });
  });

  describe('FrontendErrorEntrySchema (live AND persisted shapes)', () => {
    it('accepts the live-mode shape (firstSeen/lastSeen/count)', () => {
      const r = FrontendErrorEntrySchema.safeParse({
        id: 1, firstSeen: '2026-05-09T11:00:00Z', lastSeen: '2026-05-09T12:00:00Z',
        count: 5,
        signature: 'TypeError:foo', message: 'oops', stack: null,
        url: null, userAgent: null, username: null,
      });
      expect(r.success).toBe(true);
    });

    it('accepts the persisted-mode shape (occurredAt/lastSeenAt/occurrenceCount)', () => {
      const r = FrontendErrorEntrySchema.safeParse({
        id: 2, occurredAt: '2026-05-09T11:00:00Z', lastSeenAt: '2026-05-09T12:00:00Z',
        occurrenceCount: 5,
        signature: 'TypeError:foo', message: 'oops', stack: null,
        url: null, userAgent: null, username: null,
      });
      expect(r.success).toBe(true);
    });
  });

  describe('ReplicationStatusSchema', () => {
    it('parses a primary with two replicas', () => {
      const r = ReplicationStatusSchema.safeParse({
        is_primary: true,
        replicas: [
          {
            application_name: 'standby1', client_addr: '10.0.0.5', state: 'streaming',
            sync_state: 'sync', write_lag_ms: 1.2, flush_lag_ms: 1.5, replay_lag_ms: 2.0,
          },
          {
            application_name: 'standby2', client_addr: null, state: 'streaming',
            sync_state: 'async', write_lag_ms: null, flush_lag_ms: null, replay_lag_ms: null,
          },
        ],
        measured_at: '2026-05-09T12:00:00Z',
      });
      expect(r.success).toBe(true);
    });
  });

  describe('AlertGroupSchema + WebhookSchema + CsrfTokenSchema', () => {
    it('parses an alert group', () => {
      const r = AlertGroupSchema.safeParse({
        fingerprint: 'abc1234567890def',
        kind: 'instance_down', severity: 'critical', target: 'api',
        count: 3, first_fired: '2026-05-09T11:00:00Z', last_fired: '2026-05-09T12:00:00Z',
        acknowledged: false, muted_until: null, incident_id: null,
      });
      expect(r.success).toBe(true);
    });

    it('parses a webhook row', () => {
      const r = WebhookSchema.safeParse({
        id: 1, name: 'Slack ops', url: 'https://hooks.slack.example/x',
        enabled: true, filter_kind: null, filter_severity: 'critical', filter_target: null,
        total_deliveries: 12, failed_deliveries: 0,
        last_delivered_at: '2026-05-09T12:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      });
      expect(r.success).toBe(true);
    });

    it('safeParse on csrf token returns null when payload is missing the token', () => {
      const out = safeParse(CsrfTokenSchema, { available: true /* no token */ }, 'csrf');
      expect(out).toBeNull();
    });
  });
});
