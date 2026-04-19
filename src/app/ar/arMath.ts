/**
 * Pure math for the AR-spotting view. No DOM, no React — easy to unit-test.
 *
 * Coordinate conventions:
 *  - Heading / bearing: degrees clockwise from true north (0–360).
 *  - Pitch: degrees above horizon (0 = horizon, +90 = zenith, −90 = ground).
 *  - Elevation angle: degrees from observer up to target (above horizon).
 */

const DEG = Math.PI / 180;

function toRad(deg: number): number {
  return deg * DEG;
}

function toDeg(rad: number): number {
  return rad / DEG;
}

/** Normalize any angle (deg) to [0, 360). */
export function normalizeDeg(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

/** Shortest signed angle from `a` to `b` in (-180, 180]. */
export function shortestAngleDiff(a: number, b: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return diff;
}

/** Initial great-circle bearing from (lat1,lon1) to (lat2,lon2), in degrees [0,360). */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

/**
 * Elevation angle (deg) looking from observer to a target at `altMeters`
 * above observer, at `groundDistanceKm` ground distance.
 * Ignores Earth curvature (fine below ~100 km).
 */
export function elevationAngleDeg(altMeters: number, groundDistanceKm: number): number {
  if (groundDistanceKm <= 0) return 90;
  const altKm = altMeters / 1000;
  return toDeg(Math.atan2(altKm, groundDistanceKm));
}
