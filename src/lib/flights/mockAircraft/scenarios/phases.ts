import { toAircraftState, type MockSeed } from '@/lib/flights/mockAircraft/buildAircraft';
import type { MockScenario } from '@/lib/flights/mockAircraft/types';

const PREFIX = 'mock:phas:';

/**
 * One aircraft per flight phase so the vertical-rate colour coding
 * (green = climbing, red = descending, grey = level) is easy to eyeball.
 */
const SEEDS: MockSeed[] = [
  // Taking off from MUC — very low altitude, climbing hard
  { icao24: PREFIX + 'climb',   callsign: 'DLH 710',  latitude: 48.36, longitude: 11.80, baroAltitude:   914, onGround: false, velocity: 80,  trueTrack:  60, verticalRate: +15.0, category: 4, originCountry: 'Germany',        depIata: 'MUC', arrIata: 'BCN', airlineIcao: 'DLH' },
  // High cruise over Alps — level at FL380
  { icao24: PREFIX + 'cruise',  callsign: 'UAE 19',   latitude: 46.60, longitude: 11.30, baroAltitude: 11_582, onGround: false, velocity: 250, trueTrack: 275, verticalRate:   0.0, category: 6, originCountry: 'UAE',            depIata: 'DXB', arrIata: 'MAD', airlineIcao: 'UAE' },
  // Descending into ZRH — quick descent
  { icao24: PREFIX + 'descnt',  callsign: 'SWR 88',   latitude: 47.80, longitude:  9.00, baroAltitude:  5_486, onGround: false, velocity: 180, trueTrack: 200, verticalRate:  -9.0, category: 4, originCountry: 'Switzerland',    depIata: 'JFK', arrIata: 'ZRH', airlineIcao: 'SWR' },
  // Final approach into FRA — low + slow + configured
  { icao24: PREFIX + 'approch', callsign: 'KLM 1767', latitude: 50.10, longitude:  8.35, baroAltitude:   610, onGround: false, velocity:  78, trueTrack:  70, verticalRate:  -3.5, category: 4, originCountry: 'Netherlands',    depIata: 'AMS', arrIata: 'FRA', airlineIcao: 'KLM' },
  // Holding pattern over LHR — slow, level
  { icao24: PREFIX + 'hold',    callsign: 'BAW 58',   latitude: 51.65, longitude: -0.20, baroAltitude:  2_438, onGround: false, velocity: 110, trueTrack: 180, verticalRate:   0.0, category: 4, originCountry: 'United Kingdom', depIata: 'JFK', arrIata: 'LHR', airlineIcao: 'BAW' },
];

export const PHASES_SCENARIO: MockScenario = {
  id: 'phases',
  label: 'Flugphasen',
  icon: '✈️',
  description: '5 Flüge: Steigflug, Cruise, Sinkflug, Final, Holding.',
  color: 'success',
  prefix: PREFIX,
  build: (now) => SEEDS.map((s) => toAircraftState(s, now)),
};
