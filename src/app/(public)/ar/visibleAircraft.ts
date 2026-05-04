import { haversineDistance } from '@/lib/utils';
import { bearingDeg, elevationAngleDeg } from '@/app/(public)/ar/arMath';
import { projectToScreen, type DeviceOrientation, type ScreenPoint, type Viewport } from '@/app/(public)/ar/arProjection';
import type { AircraftState } from '@/lib/types';

/** Hard distance cap; anything farther is too faint to show. */
export const MAX_DISTANCE_KM = 200;

export interface ArAircraft {
  aircraft: AircraftState;
  distanceKm: number;
  bearingDeg: number;
  elevationDeg: number;
  screen: ScreenPoint;
}

interface Observer {
  lat: number;
  lon: number;
}

function isTrackable(ac: AircraftState): boolean {
  return (
    ac.latitude != null && ac.longitude != null
    && ac.baroAltitude != null && ac.baroAltitude > 0
    && !ac.onGround
  );
}

function toArAircraft(ac: AircraftState, observer: Observer, orientation: DeviceOrientation, viewport: Viewport): ArAircraft | null {
  const distanceKm = haversineDistance(observer.lat, observer.lon, ac.latitude!, ac.longitude!);
  if (distanceKm > MAX_DISTANCE_KM) return null;
  const bearing = bearingDeg(observer.lat, observer.lon, ac.latitude!, ac.longitude!);
  const elevation = elevationAngleDeg(ac.baroAltitude!, distanceKm);
  const screen = projectToScreen(bearing, elevation, orientation, viewport);
  return { aircraft: ac, distanceKm, bearingDeg: bearing, elevationDeg: elevation, screen };
}

function byDistance(a: ArAircraft, b: ArAircraft): number {
  return a.distanceKm - b.distanceKm;
}

interface Params {
  aircraftMap: ReadonlyMap<string, AircraftState>;
  observer: Observer;
  orientation: DeviceOrientation;
  viewport: Viewport;
}

/**
 * Project every trackable aircraft onto screen. Returns only the ones that end
 * up inside the camera's field of view, sorted by distance (nearest first).
 */
export function collectVisibleAircraft({ aircraftMap, observer, orientation, viewport }: Params): ArAircraft[] {
  const out: ArAircraft[] = [];
  aircraftMap.forEach((ac) => {
    if (!isTrackable(ac)) return;
    const entry = toArAircraft(ac, observer, orientation, viewport);
    if (entry?.screen.inView) out.push(entry);
  });
  return out.sort(byDistance);
}
