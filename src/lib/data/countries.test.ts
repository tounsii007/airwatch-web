// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countryByCode, countryFlag, countryName, isCountriesLoaded, loadCountries, __resetCountriesForTest } from './countries';

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
}

describe('countries loader', () => {
  beforeEach(() => {
    // Drop the module-scope cache + in-flight promise so each test starts cold.
    __resetCountriesForTest();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('hydrates the COUNTRIES map from the backend response', async () => {
    mockFetch([
      { code: 'DE', code3: 'DEU', name: 'Germany', population: 83000000,
        continent: 'EU', currencyCode: 'EUR', currencyName: 'Euro',
        capital: 'Berlin', phone: '+49', flag: '🇩🇪' },
      { code: 'us', code3: 'USA', name: 'United States', population: null,
        continent: 'NA', currencyCode: 'USD', currencyName: null,
        capital: 'Washington', phone: '+1', flag: '🇺🇸' },
    ]);

    await loadCountries();

    expect(isCountriesLoaded()).toBe(true);
    expect(countryByCode('DE')?.capital).toBe('Berlin');
    // Lowercase input must resolve — backend uppercases anyway.
    expect(countryByCode('us')?.name).toBe('United States');
  });

  it('falls back to the unicode regional-indicator flag when backend is cold', () => {
    // Even with zero rows loaded, every ISO alpha-2 produces a valid emoji.
    expect(countryFlag('DE')).toBe('🇩🇪');
    expect(countryFlag('us')).toBe('🇺🇸');
    expect(countryFlag('FR')).toBe('🇫🇷');
  });

  it('returns the stored emoji when the backend supplied one', async () => {
    // If Airlabs ships a curated emoji we prefer it over the derived one,
    // because some entries use the official ISO recommended sequence.
    mockFetch([{ code: 'DE', code3: 'DEU', name: 'Germany', flag: '🟢' }]);
    await loadCountries();
    expect(countryFlag('DE')).toBe('🟢');
  });

  it('returns "" for an unknown country name without throwing', () => {
    expect(countryName('XX')).toBe('');
    expect(countryByCode('')).toBeNull();
  });

  it('allows a retry after an HTTP failure (loadPromise resets)', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) return new Response('', { status: 503 });
      return new Response(JSON.stringify([{ code: 'DE', name: 'Germany' }]), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    await loadCountries();
    expect(isCountriesLoaded()).toBe(false);

    // Second call must re-fetch (loadPromise was reset on the 503).
    await loadCountries();
    expect(isCountriesLoaded()).toBe(true);
    expect(calls).toBe(2);
  });
});
