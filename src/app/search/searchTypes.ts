import type { AircraftState } from '@/lib/types';

export interface FlightResult {
  type: 'flight';
  aircraft: AircraftState;
  title: string;
  subtitle: string;
  status?: string;
  logoUrl?: string;
}

export interface AirlineResult {
  type: 'airline';
  icao: string;
  title: string;
  subtitle: string;
  logoUrl?: string;
}

export type SearchResult = FlightResult | AirlineResult;

export const MIN_QUERY_LENGTH = 2;
export const MAX_FLIGHT_RESULTS = 50;
export const MAX_AIRLINE_RESULTS = 10;
