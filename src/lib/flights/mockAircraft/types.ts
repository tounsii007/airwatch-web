import type { AircraftState } from '@/lib/types';

/**
 * Global prefix that identifies every dev-only mock aircraft. Each scenario
 * adds its own sub-prefix after this (e.g. `mock:emer:7700a`) so we can purge
 * them individually — but a single prefix check still catches all mocks.
 */
export const MOCK_GLOBAL_PREFIX = 'mock:';

/** A tagged subset of mocks — one scenario per UI toggle. */
export interface MockScenario {
  /** Stable identifier used for per-scenario cleanup. */
  id: string;
  /** Short human-readable label shown in the dev-tools panel. */
  label: string;
  /** Emoji/text icon rendered next to the toggle. */
  icon: string;
  /** One-line description shown under the toggle. */
  description: string;
  /** CSS-color hint for the active-toggle state. */
  color: 'error' | 'warning' | 'success' | 'primary' | 'accent' | 'info';
  /** Icao24 prefix used by every aircraft in this scenario. */
  prefix: string;
  /** Pure factory — returns AircraftState[] with `lastUpdate = nowMs`. */
  build: (nowMs: number) => AircraftState[];
}

export function isMockAircraft(ac: Pick<AircraftState, 'icao24'>): boolean {
  return ac.icao24.startsWith(MOCK_GLOBAL_PREFIX);
}

export function isMockFromScenario(ac: Pick<AircraftState, 'icao24'>, prefix: string): boolean {
  return ac.icao24.startsWith(prefix);
}
