import { getAirlineLogoUrl, resolveAirline, searchAirlines } from '@/lib/data/airlines';
import type { AircraftState } from '@/lib/types';
import type { AirlineResult } from '@/app/search/searchTypes';

function toAirlineResult(icao: string, iata: string | undefined, name: string | undefined, country: string | undefined, fallbackSubtitle?: string): AirlineResult {
  return {
    type: 'airline',
    icao,
    title: name ?? icao,
    subtitle: iata && name ? `${icao}/${iata} • ${country ?? ''}` : fallbackSubtitle ?? `Airline (ICAO: ${icao})`,
    logoUrl: iata ? getAirlineLogoUrl(iata) : undefined,
  };
}

/** Collect airline results by scanning live callsign prefixes. */
function fromLiveCallsigns(aircraftMap: ReadonlyMap<string, AircraftState>, q: string): Map<string, AirlineResult> {
  const out = new Map<string, AirlineResult>();
  aircraftMap.forEach((ac) => {
    const callsign = ac.callsign?.toUpperCase() ?? '';
    if (callsign.length < 3) return;
    const prefix = callsign.slice(0, 3);
    if (!prefix.includes(q) || out.has(prefix)) return;
    const info = resolveAirline(callsign);
    out.set(prefix, toAirlineResult(prefix, info?.iata, info?.name, info?.country));
  });
  return out;
}

/** Merge in results from the airline DB for airlines that have no live flights. */
function mergeDbAirlines(map: Map<string, AirlineResult>, query: string): Map<string, AirlineResult> {
  for (const a of searchAirlines(query)) {
    if (map.has(a.icao)) continue;
    map.set(a.icao, toAirlineResult(a.icao, a.iata, a.name, a.country));
  }
  return map;
}

/** Build the airline-results list (live prefixes + DB matches). */
export function buildAirlineResults(aircraftMap: ReadonlyMap<string, AircraftState>, q: string, query: string): AirlineResult[] {
  const live = fromLiveCallsigns(aircraftMap, q);
  return Array.from(mergeDbAirlines(live, query).values());
}
