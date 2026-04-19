import { toAircraftState, type MockSeed } from '@/lib/flights/mockAircraft/buildAircraft';
import type { MockScenario } from '@/lib/flights/mockAircraft/types';

const PREFIX = 'mock:rare:';

/**
 * Unusual aircraft types — great for eyeballing the category-based marker
 * rendering (heavy / light / helicopter) and the Spotting view's "Legendary"
 * tier classification.
 */
const SEEDS: MockSeed[] = [
  // Antonov An-124 heavy freighter — ADB callsign → Legendary tier in /spotting
  { icao24: PREFIX + 'adb101', callsign: 'ADB 101',  latitude: 49.80, longitude: 16.40, baroAltitude: 10_058, onGround: false, velocity: 230, trueTrack:  95, verticalRate:  0, category: 6, originCountry: 'Ukraine',       airlineIcao: 'ADB' },
  // Airbus A380 over Atlantic — double-deck widebody
  { icao24: PREFIX + 'uae23',  callsign: 'UAE 23',   latitude: 51.10, longitude: -8.50, baroAltitude: 11_887, onGround: false, velocity: 250, trueTrack: 275, verticalRate:  0, category: 6, originCountry: 'UAE',           depIata: 'DXB', arrIata: 'JFK', airlineIcao: 'UAE' },
  // Medical helicopter — very slow, very low altitude
  { icao24: PREFIX + 'hems1',  callsign: 'CHX 42',   latitude: 50.20, longitude:  8.60, baroAltitude:    305, onGround: false, velocity:  60, trueTrack: 180, verticalRate: +1, category: 1, originCountry: 'Germany',       airlineIcao: 'CHX' },
  // Private business jet — Gulfstream-class
  { icao24: PREFIX + 'net55',  callsign: 'NJE 55S',  latitude: 48.80, longitude:  9.20, baroAltitude:  9_449, onGround: false, velocity: 220, trueTrack: 220, verticalRate:  0, category: 2, originCountry: 'Portugal',      airlineIcao: 'NJE' },
  // Cargo — FedEx night freight
  { icao24: PREFIX + 'fdx5',   callsign: 'FDX 5002', latitude: 47.90, longitude:  5.20, baroAltitude: 10_973, onGround: false, velocity: 245, trueTrack: 270, verticalRate:  0, category: 5, originCountry: 'United States', depIata: 'CDG', arrIata: 'MEM', airlineIcao: 'FDX' },
];

export const RARE_SCENARIO: MockScenario = {
  id: 'rare',
  label: 'Besondere Typen',
  icon: '🦅',
  description: '5 Flüge: An-124, A380, Rettungshelikopter, Business-Jet, FedEx.',
  color: 'primary',
  prefix: PREFIX,
  build: (now) => SEEDS.map((s) => toAircraftState(s, now)),
};
