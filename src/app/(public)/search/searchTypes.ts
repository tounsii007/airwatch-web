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

export interface AirportResult {
  type: 'airport';
  iata: string;
  title: string;
  subtitle: string;
}

/**
 * Country-pivot result: surfaced when a query matches a country name in any
 * of the nine supported locales. Carries the canonical English name so the
 * UI can re-localise it for display, and an ISO-2 code for flag rendering.
 */
export interface CountryResult {
  type: 'country';
  /** Canonical English country name — feed back through {@code localizeCountry}. */
  canonical: string;
  /** ISO-3166 alpha-2 code, lowercase. May be empty for niche territories. */
  code: string;
  /** Count of related airlines / airports / flights — used for the badge. */
  airlineCount: number;
  airportCount: number;
  flightCount: number;
}

export type SearchResult = FlightResult | AirlineResult | AirportResult | CountryResult;

export const MIN_QUERY_LENGTH = 2;
export const MAX_FLIGHT_RESULTS = 50;
export const MAX_AIRLINE_RESULTS = 10;
// 50 keeps major hubs (FRA, MUC, …) in-list for big-country queries — at
// 25 the alphabetical cap dropped Frankfurt off German results in favour
// of obscure regional fields. 50 still fits a single short-scroll screen
// on the search page.
export const MAX_AIRPORT_RESULTS = 50;
