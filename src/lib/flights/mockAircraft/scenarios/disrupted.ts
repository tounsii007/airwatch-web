import { toAircraftState, type MockSeed } from '@/lib/flights/mockAircraft/buildAircraft';
import type { MockScenario } from '@/lib/flights/mockAircraft/types';

const PREFIX = 'mock:disr:';

/**
 * Operational disruptions — gives us a way to eyeball how the UI renders
 * non-standard flight statuses alongside the usual en-route / landed pair.
 */
const SEEDS: MockSeed[] = [
  // Cancelled flight parked at FRA
  { icao24: PREFIX + 'cancel1',  callsign: 'LH 472',   latitude: 50.040, longitude: 8.570, baroAltitude: 110, onGround: true,  velocity:   0, trueTrack:   0, verticalRate:  0, category: 4, originCountry: 'Germany',        flightStatus: 'cancelled', depIata: 'FRA', arrIata: 'BOS', airlineIcao: 'DLH' },
  // Diverted — heading away from original destination
  { icao24: PREFIX + 'divert1',  callsign: 'BAW 2276', latitude: 53.300, longitude: -2.000, baroAltitude: 9_144, onGround: false, velocity: 210, trueTrack:  20, verticalRate: -5, category: 4, originCountry: 'United Kingdom', flightStatus: 'diverted',  depIata: 'LHR', arrIata: 'MAN', airlineIcao: 'BAW' },
  // Scheduled — at gate, not yet pushed back
  { icao24: PREFIX + 'sched1',   callsign: 'DLH 2301', latitude: 48.354, longitude: 11.786, baroAltitude: 140, onGround: true,  velocity:   0, trueTrack:   0, verticalRate:  0, category: 4, originCountry: 'Germany',        flightStatus: 'scheduled', depIata: 'MUC', arrIata: 'CDG', airlineIcao: 'DLH' },
  // Delayed departure still on the ground
  { icao24: PREFIX + 'delay1',   callsign: 'SWR 8145', latitude: 47.457, longitude:  8.555, baroAltitude: 440, onGround: true,  velocity:  10, trueTrack: 140, verticalRate:  0, category: 3, originCountry: 'Switzerland',    flightStatus: 'delayed',   depIata: 'ZRH', arrIata: 'CDG', airlineIcao: 'SWR' },
];

export const DISRUPTED_SCENARIO: MockScenario = {
  id: 'disrupted',
  label: 'Gestörter Betrieb',
  icon: '⛔',
  description: '4 Flüge: cancelled, diverted, scheduled, delayed.',
  color: 'warning',
  prefix: PREFIX,
  build: (now) => SEEDS.map((s) => toAircraftState(s, now)),
};
