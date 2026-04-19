'use client';

import { useMemo } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { buildAirlineResults } from '@/app/search/buildAirlineResults';
import { buildFlightResult, matchesQuery, sortFlightResults } from '@/app/search/buildFlightResult';
import { MAX_AIRLINE_RESULTS, MAX_FLIGHT_RESULTS, MIN_QUERY_LENGTH, type AirlineResult, type FlightResult } from '@/app/search/searchTypes';

/** Result-builder hook for the search page. */
export function useSearchResults(query: string): { flights: FlightResult[]; airlines: AirlineResult[] } {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);

  return useMemo(() => {
    if (query.length < MIN_QUERY_LENGTH) return { flights: [], airlines: [] };
    const q = query.toUpperCase();

    const flights: FlightResult[] = [];
    aircraftMap.forEach((ac) => {
      if (matchesQuery(ac, q)) flights.push(buildFlightResult(ac));
    });

    return {
      flights: sortFlightResults(flights, q).slice(0, MAX_FLIGHT_RESULTS),
      airlines: buildAirlineResults(aircraftMap, q, query).slice(0, MAX_AIRLINE_RESULTS),
    };
  }, [aircraftMap, query]);
}
