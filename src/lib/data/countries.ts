/**
 * Lazy-loaded country index, hydrated from the backend
 * {@code /api/proxy/countries} catalogue (populated by CountrySyncService).
 *
 * <p>Used to render flag emojis + capital + currency on the country-picker
 * UI without repeated Airlabs calls. The single global call returns ~250
 * rows in a few KB.
 *
 * <p>Same loading contract as airports.ts: idempotent {@link loadCountries},
 * resets the promise on failure so retries work, falls back to empty
 * strings/null for unknown codes.
 */

export interface CountryRecord {
  /** ISO-3166 alpha-2 (e.g. "DE"). */
  code: string;
  /** ISO-3166 alpha-3 (e.g. "DEU"). Nullable for niche territories. */
  code3: string | null;
  name: string;
  population: number | null;
  /** Continent code: AF / AN / AS / EU / NA / OC / SA. */
  continent: string | null;
  currencyCode: string | null;
  currencyName: string | null;
  capital: string | null;
  /** Direct-dial phone prefix (e.g. "+49"). */
  phone: string | null;
  /** Flag emoji (4-byte UTF-8) — usable directly in JSX. */
  flag: string | null;
}

/** ISO-3166 alpha-2 → CountryRecord map. */
export const COUNTRIES: Record<string, CountryRecord> = {};

let loadPromise: Promise<void> | null = null;

interface BackendCountryDto {
  code: string;
  code3: string | null;
  name: string;
  population: number | null;
  continent: string | null;
  currencyCode: string | null;
  currencyName: string | null;
  capital: string | null;
  phone: string | null;
  flag: string | null;
}

export function loadCountries(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch('/api/proxy/countries', { cache: 'no-store' });
      if (!res.ok) { loadPromise = null; return; }
      const list = (await res.json()) as BackendCountryDto[];
      if (!Array.isArray(list) || list.length === 0) { loadPromise = null; return; }
      for (const item of list) {
        const code = item.code.toUpperCase();
        COUNTRIES[code] = { ...item, code };
      }
    } catch (err) {
      loadPromise = null;

      console.error('[countries] failed to load', err);
    }
  })();
  return loadPromise;
}

export function countryByCode(code: string): CountryRecord | null {
  return COUNTRIES[code?.toUpperCase()] ?? null;
}

export function countryName(code: string): string {
  return countryByCode(code)?.name ?? '';
}

export function countryFlag(code: string): string {
  // Fall back to the unicode regional-indicator combo derived from the
  // alpha-2 code — works for every ISO country whether the backend has
  // loaded yet or not. Each letter shifts to U+1F1E6 + (letter - 'A').
  const stored = countryByCode(code)?.flag;
  if (stored) return stored;
  if (!code || code.length !== 2) return '';
  const A = 'A'.charCodeAt(0);
  const REGIONAL = 0x1F1E6;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    REGIONAL + upper.charCodeAt(0) - A,
    REGIONAL + upper.charCodeAt(1) - A,
  );
}

export function isCountriesLoaded(): boolean {
  return Object.keys(COUNTRIES).length > 0;
}

/**
 * Test-only: discard the cached load-promise + entries so the next call
 * re-fetches. Production callers should never use this — the module is
 * designed to be hydrated once per session.
 */
export function __resetCountriesForTest(): void {
  loadPromise = null;
  for (const k of Object.keys(COUNTRIES)) delete COUNTRIES[k];
}
