'use client';

import { useMemo } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { buildAirlineResults } from '@/app/(public)/search/buildAirlineResults';
import { buildFlightResult, matchesQuery, sortFlightResults } from '@/app/(public)/search/buildFlightResult';
import { buildCountryResults } from '@/app/(public)/search/buildCountryResults';
import {
  MAX_AIRLINE_RESULTS,
  MAX_FLIGHT_RESULTS,
  MIN_QUERY_LENGTH,
  type AirlineResult,
  type AirportResult,
  type CountryResult,
  type FlightResult,
} from '@/app/(public)/search/searchTypes';

export interface SearchResults {
  flights: FlightResult[];
  airlines: AirlineResult[];
  airports: AirportResult[];
  country: CountryResult | null;
}

/**
 * Result-builder hook for the search page.
 *
 * <h3>Country-aware</h3>
 * When {@code query} resolves to a country alias in any of the nine supported
 * locales (Tunesien → Tunisia, تونس → Tunisia, …), the hook produces an
 * augmented result set that includes airlines registered in that country,
 * airports located there, and live flights connected to / from there. The
 * country pivot does <i>not</i> replace the standard text-match results —
 * both layers merge so that typing "Tunisair" still surfaces the flight tile
 * and typing "Tunesien" surfaces both the company and the country bundle.
 */
export function useSearchResults(query: string): SearchResults {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);

  return useMemo(() => {
    if (query.length < MIN_QUERY_LENGTH) {
      return { flights: [], airlines: [], airports: [], country: null };
    }
    const q = query.toUpperCase();

    // ── Text-match flights ───────────────────────────────────────────────
    const textFlights: FlightResult[] = [];
    aircraftMap.forEach((ac) => {
      if (matchesQuery(ac, q)) textFlights.push(buildFlightResult(ac));
    });

    // ── Country pivot ────────────────────────────────────────────────────
    const country = buildCountryResults(aircraftMap, query);

    // ── Merge & dedupe ───────────────────────────────────────────────────
    // Country-matched flights come second so the more direct text match
    // wins for ordering. Same dedupe key as the search store: ICAO24.
    const flightById = new Map<string, FlightResult>();
    for (const f of textFlights) flightById.set(f.aircraft.icao24, f);
    for (const f of country.flights) if (!flightById.has(f.aircraft.icao24)) flightById.set(f.aircraft.icao24, f);
    const mergedFlights = sortFlightResults(Array.from(flightById.values()), q).slice(0, MAX_FLIGHT_RESULTS);

    const textAirlines = buildAirlineResults(aircraftMap, q, query);
    const airlineByIcao = new Map<string, AirlineResult>();
    for (const a of textAirlines) airlineByIcao.set(a.icao, a);
    for (const a of country.airlines) if (!airlineByIcao.has(a.icao)) airlineByIcao.set(a.icao, a);
    const mergedAirlines = Array.from(airlineByIcao.values()).slice(0, MAX_AIRLINE_RESULTS);

    return {
      flights: mergedFlights,
      airlines: mergedAirlines,
      airports: country.airports,
      country: country.country,
    };
  }, [aircraftMap, query]);
}
