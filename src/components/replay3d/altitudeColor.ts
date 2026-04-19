import { CONVERSION } from '@/lib/constants';

/** RGB triplets for the altitude bands (deck.gl wants [r,g,b,a]). */
const BAND_COLORS: readonly [number, number, number][] = [
  [107, 114, 128],   // ground  — grey
  [74, 222, 128],    // < 10k ft — green
  [251, 191, 36],    // < 30k ft — amber
  [232, 121, 168],   // > 30k ft — magenta
];

/** Height in feet for each band boundary. */
const LOW_FT = 10_000;
const MED_FT = 30_000;
const GROUND_FT = 100;

function bandIndex(altMeters: number, onGround: boolean): number {
  if (onGround || altMeters <= 0) return 0;
  const ft = altMeters * CONVERSION.metersToFeet;
  if (ft < GROUND_FT) return 0;
  if (ft < LOW_FT) return 1;
  if (ft < MED_FT) return 2;
  return 3;
}

/** RGBA array deck.gl can consume directly, with the given opacity. */
export function altitudeColorRgba(altMeters: number, opacity = 255): [number, number, number, number] {
  const [r, g, b] = BAND_COLORS[bandIndex(altMeters, false)];
  return [r, g, b, opacity];
}
