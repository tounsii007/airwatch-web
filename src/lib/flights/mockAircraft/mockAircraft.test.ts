import { describe, expect, it } from 'vitest';
import {
  MOCK_GLOBAL_PREFIX,
  MOCK_SCENARIOS,
  findScenario,
  isMockAircraft,
  isMockFromScenario,
} from '@/lib/flights/mockAircraft';

const NOW = 1_700_000_000_000;

describe('MOCK_SCENARIOS registry', () => {
  it('exposes six non-empty scenarios in a stable order', () => {
    expect(MOCK_SCENARIOS.map((s) => s.id)).toEqual([
      'emergency', 'ground', 'phases', 'military', 'disrupted', 'rare',
    ]);
  });

  it('every scenario builds at least one aircraft', () => {
    for (const s of MOCK_SCENARIOS) {
      expect(s.build(NOW).length).toBeGreaterThan(0);
    }
  });

  it('scenario prefixes are unique — otherwise per-scenario cleanup would collide', () => {
    const prefixes = MOCK_SCENARIOS.map((s) => s.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('every aircraft icao24 starts with its scenario prefix AND the global prefix', () => {
    for (const s of MOCK_SCENARIOS) {
      for (const ac of s.build(NOW)) {
        expect(ac.icao24.startsWith(s.prefix)).toBe(true);
        expect(ac.icao24.startsWith(MOCK_GLOBAL_PREFIX)).toBe(true);
      }
    }
  });

  it('lastUpdate is the exact timestamp we passed in', () => {
    for (const s of MOCK_SCENARIOS) {
      for (const ac of s.build(NOW)) {
        expect(ac.lastUpdate).toBe(NOW);
      }
    }
  });
});

describe('findScenario', () => {
  it('returns the matching scenario', () => {
    expect(findScenario('emergency')?.label).toBe('Emergency-Squawks');
    expect(findScenario('ground')?.label).toBe('Boden-Operationen');
  });

  it('returns undefined for unknown ids', () => {
    expect(findScenario('does-not-exist')).toBeUndefined();
  });
});

describe('isMockAircraft / isMockFromScenario', () => {
  it('identifies any mock aircraft', () => {
    expect(isMockAircraft({ icao24: 'mock:emer:7700a' })).toBe(true);
    expect(isMockAircraft({ icao24: 'mock:grnd:fra1' })).toBe(true);
    expect(isMockAircraft({ icao24: 'a1b2c3' })).toBe(false);
  });

  it('distinguishes scenarios by prefix', () => {
    expect(isMockFromScenario({ icao24: 'mock:emer:7700a' }, 'mock:emer:')).toBe(true);
    expect(isMockFromScenario({ icao24: 'mock:emer:7700a' }, 'mock:grnd:')).toBe(false);
  });
});

describe('emergency scenario sanity', () => {
  it('contains aircraft with each emergency squawk (7500 / 7600 / 7700)', () => {
    const emergency = findScenario('emergency')!;
    const squawks = new Set(emergency.build(NOW).map((a) => a.squawk));
    expect(squawks.has('7700')).toBe(true);
    expect(squawks.has('7600')).toBe(true);
    expect(squawks.has('7500')).toBe(true);
  });
});

describe('ground scenario sanity', () => {
  it('every aircraft is on the ground', () => {
    const ground = findScenario('ground')!;
    for (const ac of ground.build(NOW)) {
      expect(ac.onGround).toBe(true);
      expect(ac.baroAltitude).toBeLessThan(500); // near airport elevation
    }
  });
});

describe('phases scenario sanity', () => {
  it('includes at least one climber and one descender (vertical rates differ in sign)', () => {
    const phases = findScenario('phases')!;
    const rates = phases.build(NOW).map((a) => a.verticalRate ?? 0);
    expect(Math.max(...rates)).toBeGreaterThan(0);
    expect(Math.min(...rates)).toBeLessThan(0);
  });
});

describe('disrupted scenario sanity', () => {
  it('contains cancelled / diverted / scheduled flight statuses', () => {
    const disrupted = findScenario('disrupted')!;
    const statuses = new Set(disrupted.build(NOW).map((a) => a.flightStatus));
    expect(statuses.has('cancelled')).toBe(true);
    expect(statuses.has('diverted')).toBe(true);
    expect(statuses.has('scheduled')).toBe(true);
  });
});
