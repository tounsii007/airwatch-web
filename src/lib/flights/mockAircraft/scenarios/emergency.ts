import { toAircraftState, type MockSeed } from '@/lib/flights/mockAircraft/buildAircraft';
import type { MockScenario } from '@/lib/flights/mockAircraft/types';

const PREFIX = 'mock:emer:';

const SEEDS: MockSeed[] = [
  { icao24: PREFIX + '7700a', callsign: 'LH 077',  latitude: 49.50, longitude:  9.00, baroAltitude: 10_363, onGround: false, velocity: 210, trueTrack:  85, verticalRate: 0, squawk: '7700', category: 4, originCountry: 'Germany',        depIata: 'FRA', arrIata: 'MUC', airlineIcao: 'DLH' },
  { icao24: PREFIX + '7700b', callsign: 'BAW 215', latitude: 51.30, longitude:  2.40, baroAltitude:  9_144, onGround: false, velocity: 195, trueTrack: 265, verticalRate: 0, squawk: '7700', category: 4, originCountry: 'United Kingdom', depIata: 'LHR', arrIata: 'FRA', airlineIcao: 'BAW' },
  { icao24: PREFIX + '7600a', callsign: 'AFR 88',  latitude: 48.60, longitude:  4.80, baroAltitude: 11_277, onGround: false, velocity: 230, trueTrack: 110, verticalRate: 0, squawk: '7600', category: 4, originCountry: 'France',         depIata: 'CDG', arrIata: 'VIE', airlineIcao: 'AFR' },
  { icao24: PREFIX + '7500a', callsign: 'DLH 404', latitude: 47.40, longitude: 11.70, baroAltitude:  7_620, onGround: false, velocity: 180, trueTrack: 220, verticalRate: 0, squawk: '7500', category: 4, originCountry: 'Germany',        depIata: 'MUC', arrIata: 'ZRH', airlineIcao: 'DLH' },
  { icao24: PREFIX + '7700c', callsign: 'TUI 91',  latitude: 45.60, longitude:  6.70, baroAltitude:  6_096, onGround: false, velocity: 165, trueTrack: 170, verticalRate: 0, squawk: '7700', category: 4, originCountry: 'Belgium',        depIata: 'BRU', arrIata: 'NCE', airlineIcao: 'TUI' },
];

export const EMERGENCY_SCENARIO: MockScenario = {
  id: 'emergency',
  label: 'Emergency-Squawks',
  icon: '🚨',
  description: '5 Flüge mit Squawks 7500 / 7600 / 7700 — zentral über Europa.',
  color: 'error',
  prefix: PREFIX,
  build: (now) => SEEDS.map((s) => toAircraftState(s, now)),
};
