import { AIRPORTS, type AirportRecord } from '@/lib/data/airports';

export type { AirportRecord };

/**
 * Lookup helpers for the airports cache. They read from the live `AIRPORTS`
 * object, which is populated once {@link loadAirports} resolves. Before that
 * they return `null` / empty strings — same as the pre-lazy-load behaviour
 * for unknown IATA codes.
 */

export function getAirportRecord(iata: string | undefined | null): AirportRecord | null {
  if (!iata) return null;
  return AIRPORTS[iata.toUpperCase()] ?? null;
}

export function getAirportCity(iata: string): string {
  return getAirportRecord(iata)?.n ?? '';
}

export function getAirportCountry(iata: string): string {
  return getAirportRecord(iata)?.c ?? '';
}

export function getAirportCoords(iata: string): { lat: number; lon: number } | null {
  const airport = getAirportRecord(iata);
  if (!airport) return null;
  return { lat: airport.la, lon: airport.lo };
}
