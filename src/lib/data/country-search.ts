/**
 * Country-scoped filters across the airline / airport / live-flight catalogues.
 *
 * <p>Powers the cross-locale country search feature: typing "Tunesien" / "tunisia"
 * / "tunisie" / "تونس" — anything that resolves via
 * {@link resolveCountryAlias} — surfaces airlines registered in that country,
 * airports located there, and live flights connected to / from there.
 *
 * <p>All helpers accept the <b>canonical English country name</b> (e.g.
 * {@code "Tunisia"}, {@code "USA"}). Use {@link resolveCountryAlias} to map a
 * user's typed query to that canonical form first.
 *
 * <h3>Two normalisation passes</h3>
 * The AIRLINES catalogue stores {@code country: 'USA' | 'United Kingdom' | …}
 * (free-form English), while the AIRPORTS index stores ISO-2 codes
 * ({@code c: 'us'}). We bridge the two via {@link countryToCode} so a single
 * canonical query reaches both.
 */

import { AIRLINES } from '@/lib/data/airlines';
import { AIRPORTS } from '@/lib/data/airports';
import { countryToCode } from '@/lib/data/country-translations';
import type { AirlineInfo, AircraftState } from '@/lib/types';

// ── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Two country strings refer to the same country if they're literally equal
 * (case-insensitive) or if they resolve to the same ISO-2 code. The latter
 * covers "USA" ≡ "United States" and "UK" ≡ "United Kingdom".
 */
function sameCountry(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  const ca = countryToCode(a);
  const cb = countryToCode(b);
  return Boolean(ca && cb && ca === cb);
}

// ── Airlines by country ─────────────────────────────────────────────────────
/**
 * Every airline in the catalogue whose home country resolves to
 * {@code canonical}. Stable order: alphabetical by airline name.
 *
 * <p>Looks across both the hand-curated AIRLINES list and any backend-loaded
 * extensions, because {@link AIRLINES} is the merged view of both.
 */
export function airlinesByCountry(canonical: string): AirlineInfo[] {
  if (!canonical) return [];
  const out: AirlineInfo[] = [];
  for (const a of Object.values(AIRLINES)) {
    if (sameCountry(a.country, canonical)) out.push(a);
  }
  out.sort((x, y) => x.name.localeCompare(y.name));
  return out;
}

// ── Airports by country ─────────────────────────────────────────────────────
/**
 * Single airport row used by the country-scoped airport list. Mirrors the
 * AIRPORTS index shape but adds the IATA back since the index is keyed by it.
 */
export interface CountryAirport {
  iata: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

/**
 * Every airport located in {@code canonical}. Results are deduplicated by IATA
 * (the AIRPORTS index sometimes registers the same record under both IATA and
 * ICAO keys; we want each physical airport once) and capped at {@code limit}
 * so the UI doesn't explode on USA / China queries which have thousands.
 *
 * <p>Default cap of 25 matches what the {@code /suggest} dropdown shows — keep
 * the UI consistent. Caller can bump it for "show all" views.
 */
export function airportsByCountry(canonical: string, limit = 25): CountryAirport[] {
  if (!canonical) return [];
  const code = countryToCode(canonical).toLowerCase();
  if (!code) return [];
  const seen = new Set<string>();
  const all: CountryAirport[] = [];
  for (const [key, rec] of Object.entries(AIRPORTS)) {
    // The AIRPORTS index is keyed by both IATA (3 letters) and ICAO (4 letters).
    // Only treat 3-letter keys as IATA — the 4-letter ICAO entries would
    // surface every airport twice in the result list.
    if (key.length !== 3) continue;
    const recCode = rec.c?.toLowerCase() ?? '';
    if (recCode !== code) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({ iata: key, name: rec.n, country: rec.c, lat: rec.la, lon: rec.lo });
  }
  // Sort first, then cap — otherwise iteration order picks which 25 survive
  // and major hubs (FRA, MUC, …) can be dropped in favour of obscure ones.
  all.sort((a, b) => a.name.localeCompare(b.name));
  return all.slice(0, limit);
}

// ── Flights connected to a country ──────────────────────────────────────────
/**
 * Predicate: does this live flight connect to {@code canonical}? Counted as
 * "connected" if either the departure IATA, arrival IATA, or the airline's
 * home country matches.
 *
 * <p>Used by the country-search result builder, which scans the in-memory
 * {@code aircraftMap} from the flight store and surfaces matches as a
 * dedicated "Flights to / from <country>" group.
 */
export function flightTouchesCountry(
  ac: AircraftState,
  canonical: string,
  airlineCountry: (icao: string) => string | undefined,
): boolean {
  if (!canonical) return false;
  const code = countryToCode(canonical).toLowerCase();
  if (!code) return false;
  const dep = ac.depIata ? AIRPORTS[ac.depIata.toUpperCase()] : null;
  const arr = ac.arrIata ? AIRPORTS[ac.arrIata.toUpperCase()] : null;
  if (dep?.c?.toLowerCase() === code) return true;
  if (arr?.c?.toLowerCase() === code) return true;
  // Airline-country match — picks up flights whose route data isn't yet
  // resolved (Airlabs route hydration runs lazily).
  const callsign = ac.callsign?.toUpperCase() ?? '';
  if (callsign.length >= 3) {
    const airlineHome = airlineCountry(callsign.slice(0, 3));
    if (airlineHome && sameCountry(airlineHome, canonical)) return true;
  }
  return false;
}
