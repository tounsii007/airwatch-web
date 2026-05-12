/**
 * On-demand city lookup against the backend
 * {@code /api/proxy/cities?country=XX} catalogue
 * (populated by CitySyncService).
 *
 * <h3>Why on-demand instead of a global pre-load</h3>
 * Cities is the largest of the three Airlabs Stammdaten sets — roughly
 * 30 000 rows worldwide. Loading the global list eats megabytes of memory
 * before the user has clicked anything. Loading per-country at first
 * touch (e.g. when the user views an airport detail) keeps the working
 * set tight and matches the access pattern.
 *
 * <h3>Caching</h3>
 * Module-scope cache keyed on country code so repeated lookups within a
 * session hit the cache, not the network. The backend response is also
 * persistent-cached (CityRepository read + Spring @Cacheable upstream),
 * so even a fresh fetch is fast.
 */

export interface CityRecord {
  cityCode: string;
  name: string;
  country: string;
  lat: number | null;
  lng: number | null;
  /** IANA timezone (e.g. "Europe/Berlin") — drives local-time displays. */
  timezone: string | null;
  population: number | null;
}

interface BackendCityDto {
  cityCode: string;
  name: string;
  country: string;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  population: number | null;
}

/** Per-country cache + in-flight promise dedup. */
const CITIES_BY_COUNTRY: Record<string, CityRecord[]> = {};
const inFlight: Record<string, Promise<CityRecord[]> | undefined> = {};

/**
 * Load every city in {@code countryCode}. Idempotent — repeated calls
 * with the same code share one in-flight fetch and return the cached
 * array on success.
 */
export async function loadCitiesForCountry(countryCode: string): Promise<CityRecord[]> {
  const cc = countryCode?.toUpperCase();
  if (!cc || cc.length !== 2) return [];
  if (CITIES_BY_COUNTRY[cc]) return CITIES_BY_COUNTRY[cc];
  const existing = inFlight[cc];
  if (existing) return existing;

  inFlight[cc] = (async () => {
    try {
      const res = await fetch(`/api/proxy/cities?country=${cc}`, { cache: 'force-cache' });
      if (!res.ok) return [];
      const list = (await res.json()) as BackendCityDto[];
      if (!Array.isArray(list)) return [];
      const records = list.map((c) => ({ ...c }));
      CITIES_BY_COUNTRY[cc] = records;
      return records;
    } catch (err) {

      console.error('[cities] failed to load', cc, err);
      return [];
    } finally {
      // Drop the in-flight marker — either we cached the result or the
      // next call should be free to retry.
      delete inFlight[cc];
    }
  })();
  // Non-null: just assigned above, but TS narrowing can't see through the
  // assign-then-read pattern with optional-valued records.
  return inFlight[cc]!;
}

/**
 * Server-side autocomplete fallback when /suggest is rate-limited or
 * quota-exhausted. Goes against the backend's local index — fast +
 * always available — never burns Airlabs quota.
 */
export async function searchCities(q: string, limit = 20): Promise<CityRecord[]> {
  const query = q?.trim();
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(`/api/proxy/cities/search?q=${encodeURIComponent(query)}`,
        { cache: 'no-store' });
    if (!res.ok) return [];
    const list = (await res.json()) as BackendCityDto[];
    if (!Array.isArray(list)) return [];
    return list.slice(0, limit).map((c) => ({ ...c }));
  } catch (err) {

    console.error('[cities] search failed', err);
    return [];
  }
}

/** Look up one city by its opaque Airlabs city_code (cache-only, sync). */
export function cityByCode(cityCode: string): CityRecord | null {
  if (!cityCode) return null;
  const lower = cityCode.toUpperCase();
  for (const rows of Object.values(CITIES_BY_COUNTRY)) {
    const hit = rows.find((c) => c.cityCode.toUpperCase() === lower);
    if (hit) return hit;
  }
  return null;
}
