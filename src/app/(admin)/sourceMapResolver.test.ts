// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveStackTrace, __clearSourceMapCache } from './sourceMapResolver';

/**
 * Coverage for client-side stack-trace de-minification.
 *
 * Trick: building a tiny synthetic .js.map that maps line/column
 * 1:0 of the bundle to a known source position is too brittle to
 * write by hand (VLQ encoding). Instead we mock {@code fetch} to
 * return a pre-built sourcemap whose mappings are deterministic for
 * a known input. The synthetic map below has ONE mapping:
 *   bundle line 1 col 0 → src/foo.ts line 5 col 10
 */

beforeEach(() => {
  __clearSourceMapCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Minimal source map: one mapping at (gen 1:0) → (orig src/foo.ts 6:10).
// "AAKU" VLQ-decodes to deltas [gen-col=0, src-idx=0, orig-line=+5,
// orig-col=+10]. Mappings indexes are 0-based; originalPositionFor
// returns 1-based to match JS Error.stack — so 0-based line 5 → 1-based 6.
const SYNTHETIC_MAP = {
  version: 3,
  file: 'bundle.js',
  sources: ['src/foo.ts'],
  names: [],
  mappings: 'AAKU',
};

function fetchOk(json: unknown): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(json), { status: 200 })) as typeof fetch;
}

describe('resolveStackTrace', () => {
  it('returns input unchanged when stack is undefined', async () => {
    const out = await resolveStackTrace(undefined);
    expect(out).toBeUndefined();
  });

  it('returns input unchanged when no frames match the parser', async () => {
    const stack = 'Error: oops\n  some non-stack thing\n  weird format';
    const out = await resolveStackTrace(stack);
    expect(out).toBe(stack);
  });

  it('keeps frame raw when sourcemap fetch fails (404)', async () => {
    window.fetch = vi.fn(async () => new Response('', { status: 404 })) as typeof fetch;
    const stack = 'Error: x\n    at foo (https://host/_next/static/chunks/abc.js:1:0)';
    const out = await resolveStackTrace(stack);
    expect(out).toContain('https://host/_next/static/chunks/abc.js:1:0');
  });

  it('rewrites a Chrome-format frame using the sourcemap', async () => {
    window.fetch = fetchOk(SYNTHETIC_MAP);
    const stack = 'Error: boom\n    at handler (https://host/bundle.js:1:0)';
    const out = await resolveStackTrace(stack);
    // Mapped to src/foo.ts:6:10 by our synthetic map
    expect(out).toContain('src/foo.ts:6:10');
  });

  it('rewrites a Firefox-format frame', async () => {
    window.fetch = fetchOk(SYNTHETIC_MAP);
    const stack = 'handler@https://host/bundle.js:1:0';
    const out = await resolveStackTrace(stack);
    expect(out).toContain('src/foo.ts:6:10');
  });

  it('caches the consumer per URL — only one fetch for many frames', async () => {
    const fetchMock = fetchOk(SYNTHETIC_MAP);
    window.fetch = fetchMock;
    const stack = [
      'Error: boom',
      '    at fn1 (https://host/bundle.js:1:0)',
      '    at fn2 (https://host/bundle.js:1:0)',
      '    at fn3 (https://host/bundle.js:1:0)',
    ].join('\n');
    await resolveStackTrace(stack);
    // 3 frames, same URL → 1 fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('hits one fetch per distinct .js URL', async () => {
    const fetchMock = fetchOk(SYNTHETIC_MAP);
    window.fetch = fetchMock;
    const stack = [
      'Error: boom',
      '    at fn1 (https://host/bundle-a.js:1:0)',
      '    at fn2 (https://host/bundle-b.js:1:0)',
    ].join('\n');
    await resolveStackTrace(stack);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caps resolution at MAX_FRAMES (50)', async () => {
    window.fetch = fetchOk(SYNTHETIC_MAP);
    const lines = ['Error: deep'];
    for (let i = 0; i < 100; i++) {
      lines.push(`    at fn${i} (https://host/bundle.js:1:0)`);
    }
    const out = await resolveStackTrace(lines.join('\n'));
    // Output is exactly 50 lines (the first 50 input lines, possibly resolved)
    expect(out!.split('\n')).toHaveLength(50);
  });

  it('mixes resolved + raw frames when only some maps are reachable', async () => {
    // Bundle-a has a map; bundle-b 404s
    window.fetch = vi.fn(async (url) => {
      if (String(url).includes('bundle-a')) {
        return new Response(JSON.stringify(SYNTHETIC_MAP), { status: 200 });
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    const stack = [
      'Error: mixed',
      '    at fnA (https://host/bundle-a.js:1:0)',
      '    at fnB (https://host/bundle-b.js:1:0)',
    ].join('\n');
    const out = await resolveStackTrace(stack);
    expect(out).toContain('src/foo.ts:6:10');           // resolved
    expect(out).toContain('bundle-b.js:1:0');           // raw, kept
  });

  it('survives malformed sourcemap JSON without throwing', async () => {
    window.fetch = vi.fn(async () =>
      new Response('not-json{', { status: 200 })) as typeof fetch;
    const stack = 'Error: x\n    at f (https://host/bundle.js:1:0)';
    // Must not throw — falls back to raw frame
    await expect(resolveStackTrace(stack)).resolves.toContain('bundle.js:1:0');
  });
});
