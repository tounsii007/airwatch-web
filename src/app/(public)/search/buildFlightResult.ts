import { getAirlineLogoUrl, resolveAirline } from '@/lib/data/airlines';
import type { AircraftState } from '@/lib/types';
import type { FlightResult } from '@/app/(public)/search/searchTypes';

function subtitleParts(airlineName: string | undefined, airlineIata: string | undefined, airlineIcao: string | undefined, icao24: string, onGround: boolean): string[] {
  const parts: string[] = [];
  if (airlineName) parts.push(airlineName);
  if (airlineIata && airlineIcao) parts.push(`(${airlineIcao}/${airlineIata})`);
  if (!airlineName) parts.push(`ICAO: ${icao24}`);
  if (onGround) parts.push('(Ground)');
  return parts;
}

function displayTitle(iata: string | undefined, callsign: string, icao24: string): string {
  if (iata && callsign.length > 3) return `${iata}${callsign.slice(3)}`;
  return callsign || icao24;
}

export function matchesQuery(aircraft: AircraftState, q: string): boolean {
  const callsign = aircraft.callsign?.toUpperCase() ?? '';
  const icao24 = aircraft.icao24.toUpperCase();
  const airline = resolveAirline(callsign);
  return (
    callsign.includes(q) ||
    icao24.includes(q) ||
    (airline?.name.toUpperCase().includes(q) ?? false)
  );
}

export function buildFlightResult(aircraft: AircraftState): FlightResult {
  const callsign = aircraft.callsign?.toUpperCase() ?? '';
  const icao24 = aircraft.icao24.toUpperCase();
  const airline = resolveAirline(callsign);
  const iata = airline?.iata;
  return {
    type: 'flight',
    aircraft,
    title: displayTitle(iata, callsign, icao24),
    subtitle: subtitleParts(airline?.name, iata, airline?.icao, icao24, aircraft.onGround).join(' '),
    status: aircraft.flightStatus,
    logoUrl: iata ? getAirlineLogoUrl(iata) : undefined,
  };
}

/** Sort callsigns that start with the query first, then alphabetically. */
export function sortFlightResults(flights: FlightResult[], q: string): FlightResult[] {
  return flights.sort((a, b) => {
    const aStarts = a.title.startsWith(q) ? 0 : 1;
    const bStarts = b.title.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.title.localeCompare(b.title);
  });
}
