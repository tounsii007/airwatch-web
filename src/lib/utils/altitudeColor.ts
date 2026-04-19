import { COLORS, CONFIG, CONVERSION } from '@/lib/constants';

const GROUND_CUTOFF_FT = 100;

function colorForFeet(feet: number): string {
  if (feet < GROUND_CUTOFF_FT) return COLORS.ground;
  if (feet < CONFIG.altitudeLowMax) return COLORS.altitudeLow;
  if (feet < CONFIG.altitudeMedMax) return COLORS.altitudeMed;
  return COLORS.altitudeHigh;
}

/** Hex color for an aircraft's altitude band. Uses `onGround` + meters input. */
export function getAltitudeColor(meters: number | undefined, onGround: boolean): string {
  if (onGround) return COLORS.ground;
  if (meters == null || meters === 0) return COLORS.primary; // no data → blue, not grey
  return colorForFeet(meters * CONVERSION.metersToFeet);
}
