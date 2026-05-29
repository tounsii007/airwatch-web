// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [
      // Should be forwarded (matches whitelist)
      { name: 'AIRWATCH_ADMIN_SID', value: 'sid-abc' },
      { name: 'XSRF-TOKEN', value: 'csrf-xyz' },
      // Should be stripped — not in whitelist, not AIRWATCH_*-prefixed
      { name: 'JSESSIONID', value: 'leaky' },
      { name: 'analytics_id', value: 'should-not-leak' },
    ],
  }),
}));

import { fetchDashboardData } from './fetcher';

interface FetchCall { url: string; init?: RequestInit }

describe('fetchDashboardData — batched port histories', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = [];
    process.env.INTERNAL_API_URL = 'http://api.test';

    globalThis.fetch = (vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });

      if (url.includes('/admin/api/monitoring/ports/history')) {
        return new Response(JSON.stringify({
          api: [
            { probed_at: '2026-05-09T12:00:00Z', up: true,  latency_ms: 10, error_msg: null },
            { probed_at: '2026-05-09T12:00:30Z', up: true,  latency_ms: 12, error_msg: null },
          ],
          postgres: [
            { probed_at: '2026-05-09T12:00:00Z', up: false, latency_ms: null, error_msg: 'timeout' },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/admin/api/monitoring/ports')) {
        return new Response(JSON.stringify([
          { port_name: 'api',      host: 'api',      port_number: 18080, up: true,  latency_ms: 12, error_msg: null,      probed_at: '2026-05-09T12:00:30Z' },
          { port_name: 'postgres', host: 'postgres', port_number: 55432, up: false, latency_ms: null, error_msg: 'timeout', probed_at: '2026-05-09T12:00:00Z' },
        ]), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.includes('/admin/api/monitoring/unauthorized-ips')) {
        return new Response('[]', { status: 200 });
      }
      if (url.includes('/admin/api/monitoring/unauthorized-events')) {
        return new Response('[]', { status: 200 });
      }
      return new Response('null', { status: 200 });
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.INTERNAL_API_URL;
  });

  it('fetches the batched ports/history endpoint exactly once (no per-port fan-out)', async () => {
    await fetchDashboardData();

    const historyCalls = calls.filter((c) => c.url.includes('/admin/api/monitoring/ports/history'));
    expect(historyCalls).toHaveLength(1);
    expect(historyCalls[0].url).toMatch(/\/admin\/api\/monitoring\/ports\/history\?minutes=60$/);

    // Per-port path should NOT be called any more.
    const perPortCalls = calls.filter((c) => /\/ports\/[^/]+\/history/.test(c.url));
    expect(perPortCalls).toHaveLength(0);
  });

  it('splices the batched response back onto each port row by port_name', async () => {
    const result = await fetchDashboardData();

    expect(result.portsWithHistory).toHaveLength(2);
    const api = result.portsWithHistory.find((p) => p.port_name === 'api');
    const pg = result.portsWithHistory.find((p) => p.port_name === 'postgres');

    expect(api?.history).toEqual([10, 12]);
    expect(api?.historyPoints).toHaveLength(2);
    expect(api?.historyPoints[0].up).toBe(true);

    // Postgres has a null latency — should land as 0 in `history` and false in `up`.
    expect(pg?.history).toEqual([0]);
    expect(pg?.historyPoints[0].up).toBe(false);
  });

  it('returns empty history arrays for ports the batch did not include', async () => {
    // Override the batched response to omit "api".
    globalThis.fetch = (vi.fn(async (url: string) => {
      if (url.endsWith('/admin/api/monitoring/ports')) {
        return new Response(JSON.stringify([
          { port_name: 'api', host: 'x', port_number: 1, up: true, latency_ms: 1, error_msg: null, probed_at: '2026-05-09T12:00:00Z' },
        ]), { status: 200 });
      }
      if (url.includes('/admin/api/monitoring/ports/history')) {
        return new Response('{}', { status: 200 });
      }
      return new Response('[]', { status: 200 });
    })) as unknown as typeof fetch;

    const result = await fetchDashboardData();
    expect(result.portsWithHistory[0].history).toEqual([]);
  });

  it('forwards only whitelisted cookies to the api on the batched call', async () => {
    await fetchDashboardData();
    const historyCall = calls.find((c) => c.url.includes('/ports/history'));
    const cookieHeader = (historyCall?.init?.headers as Record<string, string> | undefined)?.Cookie;
    // Session + CSRF token are forwarded
    expect(cookieHeader).toContain('AIRWATCH_ADMIN_SID=sid-abc');
    expect(cookieHeader).toContain('XSRF-TOKEN=csrf-xyz');
    // Backend session id and third-party cookies are stripped — privacy +
    // request-smuggling defence-in-depth.
    expect(cookieHeader).not.toContain('JSESSIONID');
    expect(cookieHeader).not.toContain('analytics_id');
  });
});
