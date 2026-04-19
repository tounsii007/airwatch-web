import { toAircraftState, type MockSeed } from '@/lib/flights/mockAircraft/buildAircraft';
import type { MockScenario } from '@/lib/flights/mockAircraft/types';

const PREFIX = 'mock:mil:';

/**
 * Callsign prefixes chosen so the existing {@code isRareCallsign} detector
 * (Spotting view) would mark them all as "Military / Government". Great for
 * eyeballing the spotter-tier rendering without waiting for a real VIP flight.
 */
const SEEDS: MockSeed[] = [
  // US Presidential — tail 28000 is SAM 28000 (the famous VC-25)
  { icao24: PREFIX + 'sam28000', callsign: 'SAM 28000', latitude: 50.80, longitude:  7.20, baroAltitude: 11_278, onGround: false, velocity: 240, trueTrack: 280, verticalRate: 0, category: 6, originCountry: 'United States', airlineIcao: 'SAM' },
  // US Air Force C-17 Globemaster — Reach
  { icao24: PREFIX + 'rch273',   callsign: 'RCH 273',   latitude: 52.30, longitude:  3.10, baroAltitude: 10_058, onGround: false, velocity: 230, trueTrack: 235, verticalRate: 0, category: 5, originCountry: 'United States', airlineIcao: 'RCH' },
  // RAF VIP — Duke callsign
  { icao24: PREFIX + 'duke81',   callsign: 'DUKE 81',   latitude: 51.80, longitude: -1.20, baroAltitude:  8_230, onGround: false, velocity: 195, trueTrack:  85, verticalRate: 0, category: 3, originCountry: 'United Kingdom', airlineIcao: 'RFR' },
  // German Luftwaffe — Government flight
  { icao24: PREFIX + 'gaf683',   callsign: 'GAF 683',   latitude: 50.15, longitude:  8.75, baroAltitude:  6_096, onGround: false, velocity: 180, trueTrack: 170, verticalRate: 0, category: 3, originCountry: 'Germany',       airlineIcao: 'GAF' },
  // Italian Air Force — Ironclad/protection flight
  { icao24: PREFIX + 'iam212',   callsign: 'IAM 212',   latitude: 44.50, longitude: 11.30, baroAltitude:  7_620, onGround: false, velocity: 210, trueTrack: 100, verticalRate: 0, category: 3, originCountry: 'Italy',         airlineIcao: 'IAM' },
];

export const MILITARY_SCENARIO: MockScenario = {
  id: 'military',
  label: 'Military & VIP',
  icon: '🎖️',
  description: '5 Flüge mit Government-/Military-Callsigns (SAM, RCH, DUKE, GAF, IAM).',
  color: 'accent',
  prefix: PREFIX,
  build: (now) => SEEDS.map((s) => toAircraftState(s, now)),
};
