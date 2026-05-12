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

/** Wire shape returned by the backend `/api/airports` endpoint. */
interface BackendAirportDto {
  icao: string;
  iata: string | null;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

/**
 * Fetch and cache the airports dataset. Safe to call multiple times — returns
 * the same promise. Idempotent once the first call succeeds.
 *
 * <h3>Source priority</h3>
 *   1. Try the live backend at `/api/proxy/airports` — populated by the
 *      AirportSyncService from Airlabs. Fresh coordinates, refreshable.
 *   2. Fall back to the static `/data/airports.json` snapshot bundled
 *      with the frontend — always available, even on a fresh deploy
 *      where the backend table hasn't been seeded yet.
 *
 * Both paths fail-soft so the user never sees an empty airport-label
 * layer on the map.
 */
export function loadAirports(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (await loadFromBackend()) return;
    await loadFromStatic();
  })();
  return loadPromise;
}

/** Returns true on success, false to signal "fall back to static JSON". */
async function loadFromBackend(): Promise<boolean> {
  try {
    const res = await fetch('/api/proxy/airports', { cache: 'no-store' });
    if (!res.ok) return false;
    const list = (await res.json()) as BackendAirportDto[];
    if (!Array.isArray(list) || list.length === 0) return false;
    for (const item of list) {
      // Backend uses ICAO as primary identity, but the frontend lookup
      // is keyed by IATA (legacy callers — airportCity('FRA') etc.).
      // Index under both so callers that only know the ICAO still hit.
      const record: AirportRecord = { c: item.country, n: item.name, la: item.lat, lo: item.lng };
      if (item.iata) AIRPORTS[item.iata.toUpperCase()] = record;
      AIRPORTS[item.icao.toUpperCase()] = record;
    }
    return true;
  } catch {
    return false;
  }
}

async function loadFromStatic(): Promise<void> {
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

    console.error('[airports] failed to load', err);
  }
}

/** True once at least one airport has been loaded. */
export function isAirportsLoaded(): boolean {
  return Object.keys(AIRPORTS).length > 0;
}

export function airportCity(iata: string): string {
  return AIRPORTS[iata?.toUpperCase()]?.n ?? '';
}

/**
 * Locale-aware variant of {@link airportCity}. Returns the city name translated
 * to the caller's active app language (see {@code city-translations.ts}). Falls
 * through to the English value unchanged when no translation is known.
 *
 * <p>Imported separately to keep this data-layer file free of the TS types that
 * live under {@code lib/types}; the locale lookup is resolved at call-site.
 */
export function airportCityLocalized(
  iata: string,
  localize: (city: string) => string,
): string {
  const raw = airportCity(iata);
  return raw ? localize(raw) : raw;
}

export function airportCountry(iata: string): string {
  return AIRPORTS[iata?.toUpperCase()]?.c ?? '';
}

export function airportCoords(iata: string): { lat: number; lon: number } | null {
  const apt = AIRPORTS[iata?.toUpperCase()];
  if (!apt) return null;
  return { lat: apt.la, lon: apt.lo };
}
