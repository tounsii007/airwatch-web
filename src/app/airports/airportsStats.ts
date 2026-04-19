import { CONVERSION } from '@/lib/constants';
import type { AircraftState } from '@/lib/types';
import type { PopularAirport } from '@/app/airports/popularAirports';

export interface AirborneStats {
  airborne: number;
  ground: number;
  total: number;
}

const DEPARTURE_CEILING_FT = 10_000;
const DEPARTURE_LIMIT = 30;

/** Count airborne vs on-ground aircraft for the header stats row. */
export function computeAirborneStats(aircraftMap: ReadonlyMap<string, AircraftState>): AirborneStats {
  let airborne = 0;
  let ground = 0;
  aircraftMap.forEach((ac) => {
    if (ac.onGround) ground++;
    else airborne++;
  });
  return { airborne, ground, total: aircraftMap.size };
}

function isRecentDeparture(ac: AircraftState): boolean {
  return Boolean(
    ac.callsign
    && !ac.onGround
    && ac.baroAltitude != null
    && ac.baroAltitude * CONVERSION.metersToFeet < DEPARTURE_CEILING_FT,
  );
}

/** First N airborne flights below 10k ft — a rough "just departed" list. */
export function collectRecentDepartures(aircraftMap: ReadonlyMap<string, AircraftState>): AircraftState[] {
  const out: AircraftState[] = [];
  for (const ac of aircraftMap.values()) {
    if (isRecentDeparture(ac)) out.push(ac);
    if (out.length >= DEPARTURE_LIMIT) break;
  }
  return out;
}

export function filterDepartures(flights: readonly AircraftState[], search: string): AircraftState[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...flights];
  return flights.filter((ac) =>
    (ac.callsign?.toLowerCase().includes(q) ?? false) ||
    (ac.originCountry?.toLowerCase().includes(q) ?? false),
  );
}

export function filterAirports(airports: readonly PopularAirport[], search: string): PopularAirport[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...airports];
  return airports.filter((a) => a.iata.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
}
