// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCitiesForCountry, searchCities } from './cities';

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
}

describe('cities loader', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns [] for an invalid country code without hitting the network', async () => {
    const f = vi.fn();
    globalThis.fetch = f as unknown as typeof fetch;
    expect(await loadCitiesForCountry('')).toEqual([]);
    expect(await loadCitiesForCountry('DEU')).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('loads cities for a country and caches them for next-time hits', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify([
      { cityCode: 'BER', name: 'Berlin', country: 'DE', lat: 52.5, lng: 13.4,
        timezone: 'Europe/Berlin', population: 3700000 },
      { cityCode: 'MUC', name: 'Munich', country: 'DE', lat: 48.1, lng: 11.6,
        timezone: 'Europe/Berlin', population: 1500000 },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));
    globalThis.fetch = f as unknown as typeof fetch;

    const first  = await loadCitiesForCountry('DE');
    const second = await loadCitiesForCountry('DE');

    expect(first).toHaveLength(2);
    expect(second).toBe(first); // identity preserved → served from cache
    expect(f).toHaveBeenCalledTimes(1); // second call did NOT refetch
  });

  it('deduplicates concurrent in-flight requests for the same country', async () => {
    let resolveOnce!: (v: Response) => void;
    const onceResp = new Promise<Response>((r) => { resolveOnce = r; });
    const f = vi.fn(() => onceResp);
    globalThis.fetch = f as unknown as typeof fetch;

    // Kick off two parallel calls — they should share the single fetch.
    const p1 = loadCitiesForCountry('FR');
    const p2 = loadCitiesForCountry('FR');
    resolveOnce(new Response(JSON.stringify([
      { cityCode: 'PAR', name: 'Paris', country: 'FR' },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const [a, b] = await Promise.all([p1, p2]);

    expect(a).toEqual(b);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('returns [] on a network error and allows retry afterwards', async () => {
    // First call throws; second call succeeds. Cache must NOT be poisoned
    // with the empty array after the failed first call.
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error('connection refused');
      return new Response(JSON.stringify([{ cityCode: 'TUN', name: 'Tunis', country: 'TN' }]),
          { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;

    expect(await loadCitiesForCountry('TN')).toEqual([]);
    const retry = await loadCitiesForCountry('TN');
    expect(retry).toHaveLength(1);
  });
});

describe('searchCities', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('skips the network for queries shorter than 2 chars', async () => {
    const f = vi.fn();
    globalThis.fetch = f as unknown as typeof fetch;
    expect(await searchCities('')).toEqual([]);
    expect(await searchCities('a')).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('URL-encodes the query and hits the search endpoint', async () => {
    mockFetch([{ cityCode: 'BER', name: 'Berlin', country: 'DE' }]);
    const result = await searchCities('Ber');
    expect(result).toHaveLength(1);
    expect((globalThis.fetch as unknown as { mock: { calls: [string][] } }).mock.calls[0][0])
      .toContain('/api/proxy/cities/search?q=Ber');
  });

  it('honours the limit parameter (defends against runaway results)', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      cityCode: `C${i}`, name: `City ${i}`, country: 'XX',
    }));
    mockFetch(many);
    const result = await searchCities('City', 10);
    expect(result).toHaveLength(10);
  });
});
