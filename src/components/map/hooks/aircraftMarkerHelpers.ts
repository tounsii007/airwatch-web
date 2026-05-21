/**
 * Non-React helpers extracted from {@link useAircraftMarkers} so the
 * hook body stays readable. None of these functions touch React state
 * directly; they're pure inputs → pure outputs (HTML strings or arrays).
 *
 *   * {@link gridSampleAircraft} — when too many aircraft fall inside
 *     the visible bbox, sample one representative per grid cell so
 *     density stays even across the viewport instead of collapsing
 *     into Europe.
 *   * {@link buildMarkerIconHtml} — composes the rotated SVG plane
 *     icon + selected/emergency outer ring, returned as an HTML
 *     string so `L.divIcon` can take it verbatim.
 *   * {@link buildSelectedTooltipHtml} — composes the floating
 *     callsign+FL tooltip body shown above the selected aircraft.
 */
import { CONVERSION } from '@/lib/constants';
import { MAX_VISIBLE_MARKERS } from '@/components/map/mapStyles';
import type { AircraftState } from '@/lib/types';

interface GridSampleBounds {
  south: number;
  north: number;
  west: number;
  east: number;
  zoom: number;
}

/**
 * Spatial grid sampling. Divides the visible bounds into a
 * cellsPerSide × cellsPerSide grid, keeps one representative per cell.
 * Returns the input unchanged when the count is already under the cap
 * or the user is zoomed in enough that visual density isn't an issue.
 */
export function gridSampleAircraft(
  visible: AircraftState[],
  bounds: GridSampleBounds,
): AircraftState[] {
  const { south, north, west, east, zoom } = bounds;
  if (visible.length <= MAX_VISIBLE_MARKERS || zoom >= 7) {
    return visible;
  }
  const latSpan = north - south;
  const lonSpan = east - west;
  const cellsPerSide = Math.ceil(Math.sqrt(MAX_VISIBLE_MARKERS));
  const cellLat = latSpan / cellsPerSide;
  const cellLon = lonSpan / cellsPerSide;
  const grid = new Map<string, AircraftState>();
  for (const ac of visible) {
    if (ac.latitude == null || ac.longitude == null) continue;
    const gy = Math.floor((ac.latitude - south) / cellLat);
    const gx = Math.floor((ac.longitude - west) / cellLon);
    const key = `${gy}:${gx}`;
    // Prefer aircraft with a callsign over those without — gives
    // identifiable representatives when cells overlap multiple flights.
    const existing = grid.get(key);
    if (!existing || (!existing.callsign && ac.callsign)) {
      grid.set(key, ac);
    }
  }
  return Array.from(grid.values());
}

interface MarkerIconOptions {
  size: number;
  rotation: number;
  color: string;
  isSelected: boolean;
  isEmergency: boolean;
}

/**
 * Compose the SVG plane icon HTML used by `L.divIcon`. The selected /
 * emergency aircraft get a soft outer pulse ring; everyone else gets
 * just the rotated silhouette.
 */
export function buildMarkerIconHtml({
  size,
  rotation,
  color,
  isSelected,
  isEmergency,
}: MarkerIconOptions): string {
  const glow = isSelected
    ? `filter:drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color});`
    : isEmergency
      ? `filter:drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color});`
      : `filter:drop-shadow(0 0 3px ${color});`;

  const pulseRing = isEmergency
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0.7;animation:squawk-pulse 1.2s ease-in-out infinite;"></div>`
    : isSelected
      ? `<div style="position:absolute;inset:-10px;border-radius:50%;border:1.5px solid ${color};opacity:0.65;animation:ring-pulse 2.6s ease-out infinite;transform-origin:center;"></div>`
      : '';

  return (
    `<div style="position:relative;width:${size}px;height:${size}px;">` +
      pulseRing +
      `<div style="width:${size}px;height:${size}px;transform:rotate(${rotation}deg);${glow}">` +
        `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}">` +
          `<path d="M12 2L10 8L3 10L3 12L10 11L10 17L7 19L7 20.5L12 19L17 20.5L17 19L14 17L14 11L21 12L21 10L14 8Z"/>` +
        `</svg>` +
      `</div>` +
    `</div>`
  );
}

interface TooltipOptions {
  label: string;
  color: string;
  baroAltitudeMeters: number | undefined;
  onGround: boolean;
}

/**
 * Compose the floating tooltip body shown above the selected aircraft.
 * Adds an FL-style altitude readout (FL350 = 35 000 ft) when airborne,
 * "GND" when on the ground, omitted entirely when we don't know.
 */
export function buildSelectedTooltipHtml({
  label,
  color,
  baroAltitudeMeters,
  onGround,
}: TooltipOptions): string {
  const feet = baroAltitudeMeters != null
    ? baroAltitudeMeters * CONVERSION.metersToFeet
    : null;
  const flLabel = feet != null && feet >= 1000
    ? `FL${Math.round(feet / 100).toString().padStart(3, '0')}`
    : onGround
      ? 'GND'
      : null;
  const altSpan = flLabel
    ? `<span style="opacity:0.7;margin-left:6px;color:${color};">${flLabel}</span>`
    : '';
  return (
    `<span style="font-family:var(--font-heading);font-size:10px;font-weight:700;` +
    `letter-spacing:1px;color:#E0F0FF;background:rgba(15,29,50,0.92);` +
    `border:1px solid ${color};border-radius:6px;padding:3px 8px;` +
    `box-shadow:0 0 12px -4px ${color};display:inline-flex;align-items:center;">` +
    `${label}${altSpan}</span>`
  );
}
