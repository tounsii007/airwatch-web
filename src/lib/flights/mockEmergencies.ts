/**
 * Thin compatibility shim around the multi-scenario mock-aircraft system.
 * New code should import from {@code @/lib/flights/mockAircraft} directly —
 * this module only exists so older imports don't break after the rewrite.
 */

import { EMERGENCY_SCENARIO } from '@/lib/flights/mockAircraft/scenarios/emergency';
import type { AircraftState } from '@/lib/types';

export { MOCK_GLOBAL_PREFIX as MOCK_ICAO_PREFIX, isMockAircraft } from '@/lib/flights/mockAircraft';

export function buildMockEmergencies(nowMs: number = Date.now()): AircraftState[] {
  return EMERGENCY_SCENARIO.build(nowMs);
}
