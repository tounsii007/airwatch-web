/**
 * Lazy-loaded airports index.
 *
 * Previously this file inlined ~8600 entries (509 KB of raw JSON compiled
 * into the JS bundle). Now the dataset lives at `public/data/airports.json`
 * and is fetched **once on the client** by {@link loadAirports}. Synchronous
 * lookup helpers (`airportCity`, `airportCountry`, `airportCoords`) read from
 * an in-memory cache that `loadAirports` populates.
 *
 * Callers that hit `airportCity('FRA')` before the index is loaded get an
 * empty string — the same fallback the old embedded version used for unknown
 * IATA codes. `GlobalEffects` triggers `loadAirports()` at the root layout,
 * so by the time any page renders an airport name the cache is warm.
 */

export interface AirportRecord {
  /** ISO-3166 alpha-2 country code */
  c: string;
  /** City / friendly name */
  n: string;
  /** Latitude */
  la: number;
  /** Longitude */
  lo: number;
}

/** IATA → AirportRecord map. Populated by `loadAirports`. */
export const AIRPORTS: Record<string, AirportRecord> = {};

let loadPromise: Promise<void> | null = null;

/**
 * Fetch and cache the airports dataset. Safe to call multiple times — returns
 * the same promise. Idempotent once the first call succeeds.
 */
export function loadAirports(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch('/data/airports.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as Record<string, AirportRecord>;
      for (const [iata, record] of Object.entries(data)) {
        AIRPORTS[iata] = record;
      }
    } catch (err) {
      // Reset so a retry is possible; don't keep an empty-forever cache.
      loadPromise = null;
      // eslint-disable-next-line no-console
      console.error('[airports] failed to load', err);
    }
  })();
  return loadPromise;
}

/** True once at least one airport has been loaded. */
export function isAirportsLoaded(): boolean {
  return Object.keys(AIRPORTS).length > 0;
}

export function airportCity(iata: string): string {
  return AIRPORTS[iata?.toUpperCase()]?.n ?? '';
}

export function airportCountry(iata: string): string {
  return AIRPORTS[iata?.toUpperCase()]?.c ?? '';
}

export function airportCoords(iata: string): { lat: number; lon: number } | null {
  const apt = AIRPORTS[iata?.toUpperCase()];
  if (!apt) return null;
  return { lat: apt.la, lon: apt.lo };
}
