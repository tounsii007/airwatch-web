import { DISRUPTED_SCENARIO } from '@/lib/flights/mockAircraft/scenarios/disrupted';
import { EMERGENCY_SCENARIO } from '@/lib/flights/mockAircraft/scenarios/emergency';
import { GROUND_SCENARIO } from '@/lib/flights/mockAircraft/scenarios/ground';
import { MILITARY_SCENARIO } from '@/lib/flights/mockAircraft/scenarios/military';
import { PHASES_SCENARIO } from '@/lib/flights/mockAircraft/scenarios/phases';
import { RARE_SCENARIO } from '@/lib/flights/mockAircraft/scenarios/rare';
import type { MockScenario } from '@/lib/flights/mockAircraft/types';

/** Every scenario available in the dev-tools panel, in display order. */
export const MOCK_SCENARIOS: readonly MockScenario[] = [
  EMERGENCY_SCENARIO,
  GROUND_SCENARIO,
  PHASES_SCENARIO,
  MILITARY_SCENARIO,
  DISRUPTED_SCENARIO,
  RARE_SCENARIO,
] as const;

export type MockScenarioId = typeof MOCK_SCENARIOS[number]['id'];

export function findScenario(id: string): MockScenario | undefined {
  return MOCK_SCENARIOS.find((s) => s.id === id);
}
