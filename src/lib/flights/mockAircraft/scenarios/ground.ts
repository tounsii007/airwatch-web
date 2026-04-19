import { toAircraftState, type MockSeed } from '@/lib/flights/mockAircraft/buildAircraft';
import type { MockScenario } from '@/lib/flights/mockAircraft/types';

const PREFIX = 'mock:grnd:';

/** Aircraft on the ground at major airports — taxi, pushback, parked at gate. */
const SEEDS: MockSeed[] = [
  // Frankfurt — A380 taxiing to runway
  { icao24: PREFIX + 'fra1', callsign: 'DLH 452',  latitude: 50.0379, longitude:  8.5622, baroAltitude: 110, onGround: true, velocity:  10, trueTrack:  90, verticalRate: 0, category: 6, originCountry: 'Germany',        depIata: 'FRA', arrIata: 'JFK', airlineIcao: 'DLH' },
  // London Heathrow — parked at gate
  { icao24: PREFIX + 'lhr1', callsign: 'BAW 1013', latitude: 51.4700, longitude: -0.4543, baroAltitude:  20, onGround: true, velocity:   0, trueTrack:   0, verticalRate: 0, category: 4, originCountry: 'United Kingdom', depIata: 'LHR', arrIata: 'DXB', airlineIcao: 'BAW' },
  // Paris Charles de Gaulle — pushback
  { icao24: PREFIX + 'cdg1', callsign: 'AFR 1680', latitude: 49.0097, longitude:  2.5479, baroAltitude: 120, onGround: true, velocity:   3, trueTrack: 180, verticalRate: 0, category: 4, originCountry: 'France',         depIata: 'CDG', arrIata: 'BCN', airlineIcao: 'AFR' },
  // Munich — taxiing out
  { icao24: PREFIX + 'muc1', callsign: 'DLH 2410', latitude: 48.3538, longitude: 11.7861, baroAltitude: 140, onGround: true, velocity:  15, trueTrack:  40, verticalRate: 0, category: 4, originCountry: 'Germany',        depIata: 'MUC', arrIata: 'HKG', airlineIcao: 'DLH' },
  // Zurich — just landed, rolling out
  { icao24: PREFIX + 'zrh1', callsign: 'SWR 318',  latitude: 47.4647, longitude:  8.5492, baroAltitude: 430, onGround: true, velocity:  45, trueTrack: 280, verticalRate: 0, category: 4, originCountry: 'Switzerland',    depIata: 'CDG', arrIata: 'ZRH', airlineIcao: 'SWR' },
];

export const GROUND_SCENARIO: MockScenario = {
  id: 'ground',
  label: 'Boden-Operationen',
  icon: '🛬',
  description: '5 Flugzeuge am Boden — Gate, Pushback, Taxi, Roll-out.',
  color: 'info',
  prefix: PREFIX,
  build: (now) => SEEDS.map((s) => toAircraftState(s, now)),
};
