// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => {
  class MockHeaders {
    private map = new Map<string, string>();
    constructor(init?: Record<string, string> | Headers | Iterable<[string, string]>) {
      if (init) {
        if (init instanceof MockHeaders) {
          for (const [k, v] of init.entries()) this.map.set(k.toLowerCase(), v);
        } else if (Symbol.iterator in (init as object)) {
          for (const [k, v] of init as Iterable<[string, string]>) this.map.set(k.toLowerCase(), v);
        } else {
          for (const [k, v] of Object.entries(init as Record<string, string>)) {
            this.map.set(k.toLowerCase(), v);
          }
        }
      }
    }
    get(k: string) { return this.map.get(k.toLowerCase()) ?? null; }
    set(k: string, v: string) { this.map.set(k.toLowerCase(), v); }
    has(k: string) { return this.map.has(k.toLowerCase()); }
    entries() { return this.map.entries(); }
  }

  class MockNextResponse {
    status: number;
    headers: MockHeaders;
    constructor(_body: unknown, init?: { status?: number; headers?: MockHeaders }) {
      this.status = init?.status ?? 200;
      this.headers = init?.headers ?? new MockHeaders();
    }
    static next(opts?: { request?: { headers?: MockHeaders } }) {
      const r = new MockNextResponse(null, { status: 200 });
      if (opts?.request?.headers) {
        // Surface the forwarded request headers so tests can inspect them.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r as any).requestHeaders = opts.request.headers;
      }
      return r;
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: class MockNextRequest {},
  };
});

import { proxy } from './proxy';

interface MockReq {
  nextUrl: { pathname: string };
  headers: { get: (k: string) => string | null };
}

function req(pathname: string, host = 'app.example.com'): MockReq {
  const map: Record<string, string> = { host };
  return {
    nextUrl: { pathname },
    headers: { get: (k: string) => map[k.toLowerCase()] ?? null },
  };
}

describe('proxy() — CSP + admin host gate', () => {
  beforeEach(() => {
    delete process.env.HTTPS_ENABLED;
    delete process.env.CSP_REPORT_ONLY;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('CSP header', () => {
    it('always sets Content-Security-Policy on the response', () => {
      const r = proxy(req('/airports') as never);
      expect(r.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('includes a fresh nonce in script-src on every call', () => {
      const a = proxy(req('/airports') as never);
      const b = proxy(req('/airports') as never);
      const cspA = a.headers.get('Content-Security-Policy')!;
      const cspB = b.headers.get('Content-Security-Policy')!;
      const nonceA = /'nonce-([^']+)'/.exec(cspA)?.[1];
      const nonceB = /'nonce-([^']+)'/.exec(cspB)?.[1];
      expect(nonceA).toBeTruthy();
      expect(nonceB).toBeTruthy();
      expect(nonceA).not.toBe(nonceB);
    });

    it('does NOT include unsafe-inline in script-src (defeats the nonce)', () => {
      const r = proxy(req('/airports') as never);
      const csp = r.headers.get('Content-Security-Policy')!;
      const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] ?? '';
      expect(scriptSrc).not.toContain('unsafe-inline');
    });

    it('forwards x-nonce + Content-Security-Policy as REQUEST headers for the layout', () => {
      const r = proxy(req('/airports') as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fwd = (r as any).requestHeaders;
      expect(fwd.get('x-nonce')).toBeTruthy();
      expect(fwd.get('Content-Security-Policy')).toBeTruthy();
    });

    it('uses Content-Security-Policy-Report-Only when CSP_REPORT_ONLY=true', () => {
      vi.stubEnv('CSP_REPORT_ONLY', 'true');
      vi.resetModules();
      // Re-import after stubbing so the module-level flag picks up the env.
      return import('./proxy').then(({ proxy: freshProxy }) => {
        const r = freshProxy(req('/x') as never);
        expect(r.headers.get('Content-Security-Policy-Report-Only')).toBeTruthy();
        expect(r.headers.get('Content-Security-Policy')).toBeNull();
      });
    });

    it('adds upgrade-insecure-requests when HTTPS_ENABLED=true', () => {
      vi.stubEnv('HTTPS_ENABLED', 'true');
      vi.resetModules();
      return import('./proxy').then(({ proxy: freshProxy }) => {
        const r = freshProxy(req('/x') as never);
        expect(r.headers.get('Content-Security-Policy')!).toContain('upgrade-insecure-requests');
      });
    });

    it('whitelists the tile / logo / radar CDNs in img-src', () => {
      const r = proxy(req('/') as never);
      const csp = r.headers.get('Content-Security-Policy')!;
      // These are the hosts the live map actually fetches from. A typo
      // in any of them silently breaks the affected feature.
      expect(csp).toContain('basemaps.cartocdn.com');
      expect(csp).toContain('tile.openstreetmap.org');
      expect(csp).toContain('tile.opentopomap.org');
      expect(csp).toContain('tilecache.rainviewer.com');
      expect(csp).toContain('pics.avs.io');
      expect(csp).toContain('mt0.google.com');
    });

    it('whitelists ws + wss + the rainviewer JSON in connect-src', () => {
      const r = proxy(req('/') as never);
      const csp = r.headers.get('Content-Security-Policy')!;
      const connectSrc = /connect-src ([^;]+)/.exec(csp)?.[1] ?? '';
      expect(connectSrc).toContain("'self'");
      expect(connectSrc).toContain('ws:');
      expect(connectSrc).toContain('wss:');
      expect(connectSrc).toContain('api.rainviewer.com');
    });

    it('locks down frame-ancestors / object-src / base-uri', () => {
      const r = proxy(req('/') as never);
      const csp = r.headers.get('Content-Security-Policy')!;
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });
  });

  describe('admin host gate', () => {
    it('blocks /admin/* on a public host with 404', () => {
      const r = proxy(req('/admin/dashboard', 'app.example.com') as never);
      expect(r.status).toBe(404);
    });

    it('allows /admin/* when host matches the admin port (:13099)', () => {
      const r = proxy(req('/admin/dashboard', 'localhost:13099') as never);
      expect(r.status).toBe(200);
    });

    it('allows /admin/* when host starts with admin.', () => {
      const r = proxy(req('/admin/dashboard', 'admin.airwatch.example') as never);
      expect(r.status).toBe(200);
    });

    it('lets the public stats-ingest beacon through on a public host', () => {
      const r = proxy(req('/admin/api/stats/ingest/view', 'app.example.com') as never);
      expect(r.status).toBe(200);
    });

    it('does NOT block non-admin paths on any host', () => {
      const r = proxy(req('/airports', 'app.example.com') as never);
      expect(r.status).toBe(200);
    });
  });
});
