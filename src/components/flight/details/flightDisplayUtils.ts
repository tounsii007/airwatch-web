/** Small pure helpers shared by mobile/desktop details layouts. */

import { CONVERSION } from '@/lib/constants';

const EMERGENCY_SQUAWKS = new Set(['7700', '7600', '7500']);

export function isEmergencySquawk(squawk?: string | null): boolean {
  return !!squawk && EMERGENCY_SQUAWKS.has(squawk);
}

/** Format vertical speed (m/s) as signed fpm. Returns '--' for null / zero. */
export function formatVerticalRateFpm(verticalRate: number | null | undefined, suffix = ''): string {
  if (verticalRate == null || verticalRate === 0) return '--';
  const sign = verticalRate > 0 ? '+' : '';
  return `${sign}${Math.round(verticalRate * CONVERSION.msToFpm)}${suffix}`;
}

/** Colour hint for a vertical-rate value, or undefined when inside dead-band. */
export function verticalRateColor(verticalRate: number | null | undefined): string | undefined {
  if (verticalRate == null) return undefined;
  if (verticalRate > 0.5) return '#4ADE80';
  if (verticalRate < -0.5) return '#F87171';
  return undefined;
}

export function formatHeading(trueTrack: number | null | undefined): string {
  return trueTrack != null ? `${Math.round(trueTrack)}°` : '--';
}

export function formatCoord(value: number | null | undefined): string {
  return value != null ? value.toFixed(4) : '--';
}
