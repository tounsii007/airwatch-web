import type { AircraftState } from '@/lib/types';

export interface CargoStats {
  airborne: number;
  ground: number;
  total: number;
  operators: number;
}

/** Aggregate per-cargo-page stats. */
export function computeCargoStats(flights: readonly AircraftState[]): CargoStats {
  let airborne = 0;
  let ground = 0;
  const ops = new Set<string>();
  for (const ac of flights) {
    if (ac.onGround) ground++;
    else airborne++;
    if (ac.airlineIcao) ops.add(ac.airlineIcao);
  }
  return { airborne, ground, total: flights.length, operators: ops.size };
}
