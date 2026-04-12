import type { AircraftState } from '@/lib/types';

export interface AirlabsFlightResponse {
  aircraft_icao?: string;
  airline_iata?: string;
  airline_icao?: string;
  alt?: number;
  arr_iata?: string;
  arr_icao?: string;
  dep_iata?: string;
  dep_icao?: string;
  dir?: number;
  flag?: string;
  flight_iata?: string;
  flight_icao?: string;
  flight_number?: string;
  hex?: string;
  lat?: number;
  lng?: number;
  reg_number?: string;
  speed?: number;
  squawk?: string;
  status?: string;
  updated?: number;
  v_speed?: number;
}

export const AIRLABS_FLIGHT_FIELDS = [
  'hex', 'reg_number', 'flag', 'lat', 'lng', 'alt', 'dir',
  'speed', 'v_speed', 'squawk', 'flight_icao', 'flight_iata',
  'flight_number', 'airline_icao', 'airline_iata', 'aircraft_icao',
  'dep_icao', 'dep_iata', 'arr_icao', 'arr_iata',
  'status', 'updated',
].join(',');

export function guessCategory(typeCode: string | undefined): number {
  if (!typeCode) return 0;
  const value = typeCode.toUpperCase();

  if (
    value.startsWith('A38') || value.startsWith('B74') || value.startsWith('B77') ||
    value.startsWith('B78') || value.startsWith('A35') || value.startsWith('A34') ||
    value.startsWith('A33') || value.startsWith('B76') || value.startsWith('IL9') ||
    value.startsWith('A30')
  ) {
    return 6;
  }

  if (
    value.startsWith('A32') || value.startsWith('A31') || value.startsWith('A21') ||
    value.startsWith('A22') || value.startsWith('B73') || value.startsWith('B75') ||
    value.startsWith('E19') || value.startsWith('E17') || value.startsWith('BCS') ||
    value.startsWith('CRJ') || value.startsWith('ERJ') || value.startsWith('E14') ||
    value.startsWith('E13') || value.startsWith('B71') || value.startsWith('MD') ||
    value.startsWith('F10') || value.startsWith('F70') || value.startsWith('SU9') ||
    value.startsWith('ARJ')
  ) {
    return 4;
  }

  if (
    value.startsWith('AT') || value.startsWith('DH') || value.startsWith('SF3') ||
    value.startsWith('D32') || value.startsWith('D38') || value.startsWith('L41') ||
    value.startsWith('AN2') || value.startsWith('JS4') || value.startsWith('SB2')
  ) {
    return 3;
  }

  if (
    value.startsWith('C1') || value.startsWith('C2') || value.startsWith('C3') ||
    value.startsWith('C5') || value.startsWith('C6') || value.startsWith('PA') ||
    value.startsWith('BE') || value.startsWith('DA') || value.startsWith('P18') ||
    value.startsWith('SR2') || value.startsWith('M20') || value.startsWith('PC1') ||
    value.startsWith('TBM')
  ) {
    return 2;
  }

  if (
    value.startsWith('R22') || value.startsWith('R44') || value.startsWith('R66') ||
    value.startsWith('EC') || value.startsWith('AS') || value.startsWith('B4') ||
    value.startsWith('B2') || value.startsWith('H1') || value.startsWith('S76') ||
    value.startsWith('S92') || value.startsWith('A10') || value.startsWith('A13') ||
    value.startsWith('A16') || value.startsWith('A18') || value.startsWith('MD5') ||
    value.startsWith('UH')
  ) {
    return 8;
  }

  return 4;
}

export function kmhToMs(kmh: number | undefined): number | undefined {
  return kmh != null ? kmh / 3.6 : undefined;
}

export function parseAirlabsFlight(flight: AirlabsFlightResponse): AircraftState {
  const altitude = flight.alt != null ? Number(flight.alt) : undefined;
  const status = flight.status ?? undefined;

  return {
    icao24: flight.hex ?? '',
    callsign: flight.flight_icao ?? flight.flight_iata ?? undefined,
    originCountry: flight.flag ?? undefined,
    latitude: flight.lat != null ? Number(flight.lat) : undefined,
    longitude: flight.lng != null ? Number(flight.lng) : undefined,
    baroAltitude: altitude,
    onGround: altitude === 0 || status === 'landed',
    velocity: kmhToMs(flight.speed != null ? Number(flight.speed) : undefined),
    trueTrack: flight.dir != null ? Number(flight.dir) : undefined,
    verticalRate: kmhToMs(flight.v_speed != null ? Number(flight.v_speed) : undefined),
    squawk: flight.squawk ?? undefined,
    category: guessCategory(flight.aircraft_icao),
    flightStatus: status,
    lastUpdate: flight.updated ?? Date.now(),
    depIata: flight.dep_iata ?? undefined,
    arrIata: flight.arr_iata ?? undefined,
    airlineIcao: flight.airline_icao ?? undefined,
  };
}

export function buildAircraftMap(flights: AirlabsFlightResponse[], maxEntries = 15000): Map<string, AircraftState> {
  const limited = flights.length > maxEntries ? flights.slice(0, maxEntries) : flights;
  const aircraftMap = new Map<string, AircraftState>();

  for (const flight of limited) {
    const aircraft = parseAirlabsFlight(flight);
    if (aircraft.icao24 && aircraft.latitude != null && aircraft.longitude != null) {
      aircraftMap.set(aircraft.icao24, aircraft);
    }
  }

  return aircraftMap;
}
