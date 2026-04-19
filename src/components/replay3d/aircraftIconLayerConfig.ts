import { IconLayer } from '@deck.gl/layers';

/**
 * Tiny SVG plane, data-URL baked in so the 3D replay works offline.
 * ~750 B, no network fetch per frame.
 */
const PLANE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">
  <path fill="#E0F0FF" stroke="#7A9ABF" stroke-width="1.2" stroke-linejoin="round"
    d="M16 1 L19 13 L31 18 L31 20 L19 17 L18 27 L22 29 L22 31 L16 30 L10 31 L10 29 L14 27 L13 17 L1 20 L1 18 L13 13 Z"/>
</svg>`.trim();

const ICON_URL = `data:image/svg+xml;utf8,${encodeURIComponent(PLANE_SVG)}`;

interface Datum {
  position: [number, number, number];
  headingDeg: number;
}

interface Params {
  currentPosition: [number, number, number] | null;
  headingDeg: number;
}

/**
 * Live marker placed at the interpolated "now" position. Rotated in 2D
 * screen-space to the current heading so it always looks correct from above,
 * and billboarded so chase-cam users still see a proper plane silhouette.
 */
export function buildAircraftIconLayer({ currentPosition, headingDeg }: Params) {
  const data: Datum[] = currentPosition
    ? [{ position: currentPosition, headingDeg }]
    : [];

  return new IconLayer<Datum>({
    id: 'replay-aircraft',
    data,
    getIcon: () => ({ url: ICON_URL, width: 64, height: 64, mask: false }),
    getPosition: (d) => d.position,
    getSize: 36,
    getAngle: (d) => -d.headingDeg, // deck.gl rotates CCW; track heading is CW
    sizeUnits: 'pixels',
    billboard: true,
  });
}
