/**
 * Public surface of the mock-aircraft system. Consumers should import from
 * this file, not the internal modules. Kept as a barrel so the implementation
 * can be reshuffled without touching callers.
 */

export { MOCK_GLOBAL_PREFIX, isMockAircraft, isMockFromScenario } from '@/lib/flights/mockAircraft/types';
export type { MockScenario } from '@/lib/flights/mockAircraft/types';
export { MOCK_SCENARIOS, findScenario } from '@/lib/flights/mockAircraft/scenarios';
export type { MockScenarioId } from '@/lib/flights/mockAircraft/scenarios';
