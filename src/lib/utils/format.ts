import { CONVERSION } from '@/lib/constants';
import type { AltitudeUnit, SpeedUnit } from '@/lib/types';

/**
 * Format altitude (meters) with the user's preferred unit. Returns '--' for
 * null / zero values.
 */
export function formatAltitude(meters: number | undefined, unit: AltitudeUnit): string {
  if (meters == null || meters === 0) return '--';
  return unit === 'feet' ? formatFeet(meters) : formatMeters(meters);
}

function formatFeet(meters: number): string {
  const ft = meters * CONVERSION.metersToFeet;
  if (ft < 1000) return `${Math.round(ft)} ft`;
  return `${(ft / 1000).toFixed(1)}k ft`;
}

function formatMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

const SPEED_CONVERT: Record<SpeedUnit, { factor: number; suffix: string }> = {
  knots: { factor: CONVERSION.msToKnots, suffix: 'kts' },
  kmh: { factor: CONVERSION.msToKmh, suffix: 'km/h' },
  mph: { factor: CONVERSION.msToMph, suffix: 'mph' },
};

/**
 * Format speed (m/s) with the user's preferred unit. Returns '--' for null / zero.
 */
export function formatSpeed(ms: number | undefined, unit: SpeedUnit): string {
  if (ms == null || ms === 0) return '--';
  const { factor, suffix } = SPEED_CONVERT[unit];
  return `${Math.round(ms * factor)} ${suffix}`;
}
