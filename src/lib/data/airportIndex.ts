import { AIRPORTS } from './airports';

export interface AirportRecord {
  c: string;
  la: number;
  lo: number;
  n: string;
}

const airportEntries = Object.entries(AIRPORTS);
const airportIndex = new Map<string, AirportRecord>(
  airportEntries.map(([iata, airport]) => [iata.toUpperCase(), airport])
);

export function getAirportRecord(iata: string | undefined | null): AirportRecord | null {
  if (!iata) return null;
  return airportIndex.get(iata.toUpperCase()) ?? null;
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
