import type { AircraftState } from '@/lib/types';

/** Known pure-freight airline ICAO codes. */
export const CARGO_AIRLINE_ICAOS = new Set([
  'FDX', 'UPS', 'GTI', 'GEC', 'CLX', 'BOX', 'ABX', 'TAY', 'NPT', 'WGN',
  'ATG', 'SQC', 'ADB', 'CKS', 'AEC', 'GMI', 'FPO', 'TGX', 'KFS', 'MSC',
  'QAF', 'BAW', 'ETD', 'UAE',
]);

/** Callsign prefixes used when the airline ICAO is missing. */
const CARGO_CALLSIGN_PREFIXES = ['FDX', 'UPS', 'GTI', 'CLX', 'BOX', 'TAY', 'GEC', 'ABX', 'WGN'] as const;

function hasCargoCallsign(cs: string): boolean {
  return CARGO_CALLSIGN_PREFIXES.some((p) => cs.startsWith(p));
}

export function isCargoFlight(ac: AircraftState): boolean {
  if (ac.airlineIcao && CARGO_AIRLINE_ICAOS.has(ac.airlineIcao.toUpperCase())) return true;
  return hasCargoCallsign(ac.callsign?.toUpperCase() ?? '');
}

export type CargoStatusFilter = 'all' | 'airborne' | 'ground';

function matchesStatus(ac: AircraftState, filter: CargoStatusFilter): boolean {
  if (filter === 'airborne') return !ac.onGround;
  if (filter === 'ground') return ac.onGround;
  return true;
}

function matchesSearch(ac: AircraftState, q: string): boolean {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    (ac.callsign?.toLowerCase().includes(query) ?? false) ||
    (ac.airlineIcao?.toLowerCase().includes(query) ?? false) ||
    (ac.depIata?.toLowerCase().includes(query) ?? false) ||
    (ac.arrIata?.toLowerCase().includes(query) ?? false)
  );
}

/** Apply status + search filters to a list of cargo aircraft. */
export function filterCargo(flights: readonly AircraftState[], search: string, status: CargoStatusFilter): AircraftState[] {
  return flights.filter((ac) => matchesStatus(ac, status) && matchesSearch(ac, search));
}
