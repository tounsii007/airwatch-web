import type { AircraftState } from '@/lib/types';

/** Shared seed shape used by every scenario. All fields required at call-site. */
export interface MockSeed {
  icao24: string;
  callsign: string;
  latitude: number;
  longitude: number;
  baroAltitude: number;
  onGround: boolean;
  velocity: number;
  trueTrack: number;
  verticalRate: number;
  squawk?: string;
  category: number;
  originCountry: string;
  flightStatus?: string;
  depIata?: string;
  arrIata?: string;
  airlineIcao?: string;
}

/** Convert a seed into the runtime AircraftState shape. Pure, testable. */
export function toAircraftState(seed: MockSeed, nowMs: number): AircraftState {
  return {
    icao24: seed.icao24,
    callsign: seed.callsign,
    originCountry: seed.originCountry,
    latitude: seed.latitude,
    longitude: seed.longitude,
    baroAltitude: seed.baroAltitude,
    onGround: seed.onGround,
    velocity: seed.velocity,
    trueTrack: seed.trueTrack,
    verticalRate: seed.verticalRate,
    squawk: seed.squawk,
    category: seed.category,
    flightStatus: seed.flightStatus ?? (seed.onGround ? 'landed' : 'en-route'),
    lastUpdate: nowMs,
    depIata: seed.depIata,
    arrIata: seed.arrIata,
    airlineIcao: seed.airlineIcao,
  };
}
