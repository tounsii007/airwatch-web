import { AIRLINES, getAirlineLogoUrl } from '@/lib/data/airlines';
import { airlinesByCountry, airportsByCountry, flightTouchesCountry } from '@/lib/data/country-search';
import { countryToCode, resolveCountryAlias } from '@/lib/data/country-translations';
import type { AircraftState } from '@/lib/types';
import type { AirlineResult, AirportResult, CountryResult, FlightResult } from '@/app/(public)/search/searchTypes';
import { buildFlightResult } from '@/app/(public)/search/buildFlightResult';
import { MAX_AIRPORT_RESULTS, MAX_FLIGHT_RESULTS } from '@/app/(public)/search/searchTypes';

/**
 * Country-pivot search bundle.
 *
 * When a query resolves to a known country in any of the nine supported
 * locales (via {@link resolveCountryAlias}) we return a self-contained bundle
 * of:
 *   - {@code country}    — a single result tile showing flag + counts;
 *   - {@code airlines}   — every airline whose home country matches;
 *   - {@code airports}   — every airport located in that country;
 *   - {@code flights}    — live flights connected to / from that country.
 *
 * <p>The bundle is empty when the query doesn't match any known country —
 * the search hook then falls back to the existing flight / airline grouping.
 */
export interface CountryResultBundle {
  country: CountryResult | null;
  airlines: AirlineResult[];
  airports: AirportResult[];
  flights: FlightResult[];
}

const EMPTY: CountryResultBundle = { country: null, airlines: [], airports: [], flights: [] };

/** Cheap accessor — used by {@link flightTouchesCountry} for airline-home lookups. */
function airlineHomeCountry(icaoPrefix: string): string | undefined {
  return AIRLINES[icaoPrefix.toUpperCase()]?.country;
}

/**
 * Build the country-scoped result bundle for {@code query}. Returns the
 * shared {@code EMPTY} singleton when no country alias matches — the
 * caller can short-circuit with a referential equality check.
 */
export function buildCountryResults(
  aircraftMap: ReadonlyMap<string, AircraftState>,
  query: string,
): CountryResultBundle {
  const canonical = resolveCountryAlias(query);
  if (!canonical) return EMPTY;

  // ── Airlines from the catalogue ──────────────────────────────────────────
  const airlines: AirlineResult[] = airlinesByCountry(canonical).map((a) => ({
    type: 'airline',
    icao: a.icao,
    title: a.name,
    // Canonical English country in the subtitle so screen readers + users
    // can verify the pivot worked. The result tile re-localises it later.
    subtitle: a.iata ? `${a.icao}/${a.iata} • ${canonical}` : `${a.icao} • ${canonical}`,
    logoUrl: a.iata ? getAirlineLogoUrl(a.iata) : undefined,
  }));

  // ── Airports in the country ──────────────────────────────────────────────
  const airports: AirportResult[] = airportsByCountry(canonical, MAX_AIRPORT_RESULTS).map((ap) => ({
    type: 'airport',
    iata: ap.iata,
    title: `${ap.iata} · ${ap.name}`,
    subtitle: canonical,
  }));

  // ── Live flights connected to the country ───────────────────────────────
  const flights: FlightResult[] = [];
  aircraftMap.forEach((ac) => {
    if (flights.length >= MAX_FLIGHT_RESULTS) return;
    if (flightTouchesCountry(ac, canonical, airlineHomeCountry)) {
      flights.push(buildFlightResult(ac));
    }
  });
  // Alphabetical by display title — stable ordering across re-renders.
  flights.sort((a, b) => a.title.localeCompare(b.title));

  const country: CountryResult = {
    type: 'country',
    canonical,
    code: countryToCode(canonical),
    airlineCount: airlines.length,
    airportCount: airports.length,
    flightCount: flights.length,
  };

  return { country, airlines, airports, flights };
}
