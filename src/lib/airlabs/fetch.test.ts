// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fetchAirlabsArray, fetchAirlabsOne } from './fetch';

const Item = z.object({ name: z.string() }).passthrough();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchAirlabsArray', () => {
  it('returns parsed items on a happy-path response', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ response: [{ name: 'one' }, { name: 'two' }] }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    if (!r.ok) throw new Error('expected ok');
    expect(r.items).toHaveLength(2);
    expect(r.dropped).toBe(0);
  });

  it('drops malformed rows but keeps the good ones streaming through', async () => {
    // Real-world Airlabs occasionally returns a row missing a required
    // field — drop that row, log it, but don't kill the whole batch.
    const fetcher = vi.fn(async () => jsonResponse({
      response: [{ name: 'good' }, { name: 42 }, { name: 'also good' }],
    }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    if (!r.ok) throw new Error('expected ok');
    expect(r.items.map(i => i.name)).toEqual(['good', 'also good']);
    expect(r.dropped).toBe(1);
  });

  it('classifies HTTP 429 as rate_limited', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 429 }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'rate_limited' });
  });

  it('classifies HTTP 5xx as upstream_5xx', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 503 }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'upstream_5xx' });
  });

  it('classifies HTTP 400 as invalid_input — distinct from server fault', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 400 }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'invalid_input' });
  });

  it('classifies in-body error.code=month_limit_exceeded as quota_exhausted', async () => {
    // Critical UX — user-visible copy must distinguish "we hit the monthly
    // quota" from generic "something broke" so support can give the right
    // answer.
    const fetcher = vi.fn(async () => jsonResponse({
      error: { code: 'month_limit_exceeded', message: 'quota gone' },
    }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'quota_exhausted' });
  });

  it('classifies in-body error.code=limit_exceeded as rate_limited', async () => {
    const fetcher = vi.fn(async () => jsonResponse({
      error: { code: 'limit_exceeded' },
    }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'rate_limited' });
  });

  it('returns empty when the response array is missing', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ /* no response field */ }));
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'empty' });
  });

  it('catches network errors without crashing', async () => {
    const fetcher = vi.fn(async () => { throw new Error('connection refused'); });
    const r = await fetchAirlabsArray('/x', Item, 'test', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'network' });
  });
});

describe('fetchAirlabsOne', () => {
  it('handles the {response: <object>} envelope shape', async () => {
    // Wiki / single-aircraft endpoints return one object directly,
    // not wrapped in an array. The helper must transparently handle both.
    const fetcher = vi.fn(async () => jsonResponse({ response: { name: 'KLM Royal Dutch Airlines' } }));
    const r = await fetchAirlabsOne('/wiki?airline_iata=KL', Item, 'wiki', fetcher as unknown as typeof fetch);
    if (!r.ok) throw new Error('expected ok');
    expect(r.item.name).toBe('KLM Royal Dutch Airlines');
  });

  it('propagates rate-limit errors from the underlying call', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 429 }));
    const r = await fetchAirlabsOne('/wiki', Item, 'wiki', fetcher as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: 'rate_limited' });
  });
});
