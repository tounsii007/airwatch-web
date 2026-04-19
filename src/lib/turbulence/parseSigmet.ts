/**
 * Parse AWC SIGMET/AIRMET response into TurbulenceZone objects.
 * API: https://aviationweather.gov/api/data/airsigmet?format=json
 */

export interface TurbulenceZone {
  id: string;
  hazard: string;
  severity: 'light' | 'moderate' | 'severe';
  polygon: [number, number][]; // [lat, lon][]
  altitudeLow?: number;  // feet
  altitudeHigh?: number; // feet
  validFrom: string;
  validTo: string;
}

const SEVERITY_COLORS: Record<TurbulenceZone['severity'], string> = {
  light: '#EAB308',    // yellow
  moderate: '#F97316',  // orange
  severe: '#EF4444',    // red
};

export function getSeverityColor(severity: TurbulenceZone['severity']): string {
  return SEVERITY_COLORS[severity];
}

function parseSeverity(raw: string | undefined): TurbulenceZone['severity'] | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('sev') || s.includes('extreme')) return 'severe';
  if (s.includes('mod')) return 'moderate';
  if (s.includes('light') || s.includes('lgt')) return 'light';
  return 'moderate'; // default if unclear
}

function parseCoords(coordStr: string | undefined): [number, number][] | null {
  if (!coordStr) return null;
  // Format: "lat1 lon1 lat2 lon2 ..." space-separated pairs
  const nums = coordStr.trim().split(/\s+/).map(Number);
  if (nums.length < 6 || nums.length % 2 !== 0) return null;
  if (nums.some(isNaN)) return null;

  const points: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) {
    points.push([nums[i], nums[i + 1]]);
  }
  return points;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseSigmetResponse(data: unknown): TurbulenceZone[] {
  if (!Array.isArray(data)) return [];

  const zones: TurbulenceZone[] = [];

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const d = item as Record<string, any>;

    // Process turbulence + convective (thunderstorm) SIGMETs
    const hazard = (d.hazard ?? d.airsigmetType ?? d.rawAirSigmet ?? '').toString();
    const hazLow = hazard.toLowerCase();
    if (!hazLow.includes('turb') && !hazLow.includes('convective') && !hazLow.includes('ts')) continue;

    const severity = parseSeverity(d.severity ?? d.intensity) ?? (hazLow.includes('convective') ? 'moderate' : null);
    if (!severity) continue;

    // Parse coordinates — AWC returns coords as [{lat, lon}] array or space-separated string
    let polygon: [number, number][] | null = null;
    if (Array.isArray(d.coords)) {
      polygon = d.coords
        .filter((p: any) => p?.lat != null && p?.lon != null)
        .map((p: any) => [Number(p.lat), Number(p.lon)] as [number, number]);
      if (polygon.length < 3) polygon = null;
    } else if (typeof d.coords === 'string') {
      polygon = parseCoords(d.coords);
    } else if (Array.isArray(d.area)) {
      polygon = d.area
        .filter((p: any) => p?.lat != null && p?.lon != null)
        .map((p: any) => [Number(p.lat), Number(p.lon)] as [number, number]);
      if (polygon!.length < 3) polygon = null;
    }

    if (!polygon || polygon.length < 3) continue;

    zones.push({
      id: d.airSigmetId ?? d.id ?? `sigmet-${zones.length}`,
      hazard,
      severity,
      polygon,
      altitudeLow: d.altitudeLow1 != null ? Number(d.altitudeLow1) : undefined,
      altitudeHigh: d.altitudeHi1 != null ? Number(d.altitudeHi1) : undefined,
      validFrom: d.validTimeFrom ?? d.issueTime ?? '',
      validTo: d.validTimeTo ?? '',
    });
  }

  return zones;
}
