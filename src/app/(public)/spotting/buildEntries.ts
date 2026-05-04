import { haversineDistance } from '@/lib/utils';
import type { AircraftState } from '@/lib/types';
import { MILITARY_GOV_PREFIXES, type SpottingEntry } from '@/app/(public)/spotting/spottingTypes';

/** Wide-body airliners (category 6 in OpenSky) get "NOTABLE". */
function maybeWideBody(aircraft: AircraftState, distance: number): SpottingEntry | null {
  if (aircraft.category !== 6) return null;
  return { aircraft, distance, rareInfo: { tier: 3, label: 'Wide-body Airliner' } };
}

function hasMilitaryPrefix(callsign: string): boolean {
  return MILITARY_GOV_PREFIXES.some((p) => callsign.startsWith(p));
}

function maybeMilitary(aircraft: AircraftState, distance: number): SpottingEntry | null {
  const callsign = aircraft.callsign?.toUpperCase() ?? '';
  if (!hasMilitaryPrefix(callsign)) return null;
  return { aircraft, distance, rareInfo: { tier: 2, label: 'Military / Government' } };
}

function classify(aircraft: AircraftState, distance: number): SpottingEntry[] {
  const out: SpottingEntry[] = [];
  const wide = maybeWideBody(aircraft, distance);
  if (wide) out.push(wide);
  const mil = maybeMilitary(aircraft, distance);
  if (mil) out.push(mil);
  return out;
}

function dedupeByIcao(entries: readonly SpottingEntry[]): SpottingEntry[] {
  const best = new Map<string, SpottingEntry>();
  for (const entry of entries) {
    const existing = best.get(entry.aircraft.icao24);
    if (!existing || entry.rareInfo.tier > existing.rareInfo.tier) best.set(entry.aircraft.icao24, entry);
  }
  return Array.from(best.values());
}

function byTierThenDistance(a: SpottingEntry, b: SpottingEntry): number {
  return a.rareInfo.tier - b.rareInfo.tier || a.distance - b.distance;
}

interface Params {
  aircraftMap: ReadonlyMap<string, AircraftState>;
  userLat: number;
  userLon: number;
  maxRadius: number;
}

/** Collect + classify + dedupe + sort nearby rare/notable aircraft. */
export function buildSpottingEntries({ aircraftMap, userLat, userLon, maxRadius }: Params): SpottingEntry[] {
  const raw: SpottingEntry[] = [];
  aircraftMap.forEach((aircraft) => {
    if (aircraft.latitude == null || aircraft.longitude == null || aircraft.onGround) return;
    const distance = haversineDistance(userLat, userLon, aircraft.latitude, aircraft.longitude);
    if (distance > maxRadius) return;
    raw.push(...classify(aircraft, distance));
  });
  return dedupeByIcao(raw).sort(byTierThenDistance);
}
