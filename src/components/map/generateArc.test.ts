import { describe, expect, it } from 'vitest';
import { generateArc } from './generateArc';

// Helper: airport coordinates
const AIRPORTS = {
  BRU: { lat: 50.90, lon: 4.48 },   // Brussels
  DSS: { lat: 14.74, lon: -17.49 },  // Dakar
  JFK: { lat: 40.64, lon: -73.78 },  // New York
  LAX: { lat: 33.94, lon: -118.41 }, // Los Angeles
  NRT: { lat: 35.76, lon: 140.39 },  // Tokyo Narita
  YYZ: { lat: 43.68, lon: -79.63 },  // Toronto
  SVO: { lat: 55.97, lon: 37.41 },   // Moscow
  HKG: { lat: 22.31, lon: 113.91 },  // Hong Kong
  SIN: { lat: 1.35, lon: 103.99 },   // Singapore
  SYD: { lat: -33.95, lon: 151.18 }, // Sydney
  LHR: { lat: 51.47, lon: -0.46 },   // London
  AKL: { lat: -37.01, lon: 174.78 }, // Auckland
  ANC: { lat: 61.17, lon: -150.03 }, // Anchorage
  FRA: { lat: 50.03, lon: 8.57 },    // Frankfurt
  DXB: { lat: 25.25, lon: 55.36 },   // Dubai
  TUN: { lat: 36.85, lon: 10.23 },   // Tunis
  CPT: { lat: -33.97, lon: 18.60 },  // Cape Town
} as const;

function arcEndLon(points: [number, number][]): number {
  return points[points.length - 1][1];
}

/** Normalize longitude to [-180, 180] for comparison */
function normLon(lon: number): number {
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

function maxLon(points: [number, number][]): number {
  return Math.max(...points.map(p => p[1]));
}

function minLon(points: [number, number][]): number {
  return Math.min(...points.map(p => p[1]));
}

describe('generateArc — basic', () => {
  it('includes both endpoints', () => {
    const points = generateArc(0, 0, 10, 20, 10);
    expect(points[0]).toEqual([0, 0]);
    expect(points.at(-1)?.[0]).toBeCloseTo(10);
    expect(points.at(-1)?.[1]).toBeCloseTo(20);
  });

  it('returns numPoints + 1 entries', () => {
    const points = generateArc(0, 0, 10, 10, 30);
    expect(points).toHaveLength(31);
  });
});

// ─────────────────────────────────────────────────
// BUG FIX: BRU → DSS (short south-southwest route)
// Heading 187° should NOT flip the route westward
// ─────────────────────────────────────────────────
describe('BRU → DSS (short route, heading ~187°)', () => {
  const { BRU, DSS } = AIRPORTS;

  it('route stays within reasonable longitude range (no wraparound)', () => {
    const points = generateArc(BRU.lat, BRU.lon, DSS.lat, DSS.lon, 30, 187);
    const lons = points.map(p => p[1]);
    // All longitudes should be between -30 and +20 (normal Atlantic range)
    for (const lon of lons) {
      expect(lon).toBeGreaterThan(-40);
      expect(lon).toBeLessThan(20);
    }
  });

  it('route goes southward (latitudes decrease)', () => {
    const points = generateArc(BRU.lat, BRU.lon, DSS.lat, DSS.lon, 30, 187);
    // Start lat > end lat (going south)
    expect(points[0][0]).toBeGreaterThan(points[points.length - 1][0]);
  });

  it('without heading, produces the same result', () => {
    const withHeading = generateArc(BRU.lat, BRU.lon, DSS.lat, DSS.lon, 30, 187);
    const without = generateArc(BRU.lat, BRU.lon, DSS.lat, DSS.lon, 30);
    // Should be identical since dLon is small
    for (let i = 0; i < withHeading.length; i++) {
      expect(withHeading[i][0]).toBeCloseTo(without[i][0], 1);
      expect(withHeading[i][1]).toBeCloseTo(without[i][1], 1);
    }
  });
});

// ─────────────────────────────────────────────────
// Similar short-route cases that must NOT wrap
// ─────────────────────────────────────────────────
describe('short routes should never wrap around the globe', () => {
  it('FRA → TUN (heading ~170°, south)', () => {
    const { FRA, TUN } = AIRPORTS;
    const points = generateArc(FRA.lat, FRA.lon, TUN.lat, TUN.lon, 20, 170);
    expect(maxLon(points)).toBeLessThan(30);
    expect(minLon(points)).toBeGreaterThan(-10);
  });

  it('LHR → JFK (heading ~260°, westward Atlantic)', () => {
    const { LHR, JFK } = AIRPORTS;
    const points = generateArc(LHR.lat, LHR.lon, JFK.lat, JFK.lon, 30, 260);
    // Normal westward route, lons decrease from ~0 to ~-74
    expect(minLon(points)).toBeGreaterThan(-80);
  });

  it('FRA → DXB (heading ~120°, southeast)', () => {
    const { FRA, DXB } = AIRPORTS;
    const points = generateArc(FRA.lat, FRA.lon, DXB.lat, DXB.lon, 20, 120);
    expect(maxLon(points)).toBeLessThan(60);
    expect(minLon(points)).toBeGreaterThan(5);
  });

  it('LHR → CPT (heading ~175°, long southward)', () => {
    const { LHR, CPT } = AIRPORTS;
    const points = generateArc(LHR.lat, LHR.lon, CPT.lat, CPT.lon, 30, 175);
    // Should go south through Africa, not wrap around
    expect(maxLon(points)).toBeLessThan(30);
    expect(minLon(points)).toBeGreaterThan(-10);
  });
});

// ─────────────────────────────────────────────────
// Transpacific: routes that SHOULD cross the date line
// ─────────────────────────────────────────────────
describe('Canada → Asia (transpacific, must cross date line)', () => {
  it('YYZ → NRT (heading ~330°, over Pacific via polar route)', () => {
    const { YYZ, NRT } = AIRPORTS;
    // dLon = 140.39 - (-79.63) = 220° → normalized to -140°
    // |dLon| > 90, heading 330° → goingEast=false → stays westward
    const points = generateArc(YYZ.lat, YYZ.lon, NRT.lat, NRT.lon, 30, 330);
    expect(normLon(arcEndLon(points))).toBeCloseTo(NRT.lon, 0);
  });

  it('YYZ → HKG via Pacific (heading ~320°)', () => {
    const { YYZ, HKG } = AIRPORTS;
    const points = generateArc(YYZ.lat, YYZ.lon, HKG.lat, HKG.lon, 30, 320);
    expect(normLon(arcEndLon(points))).toBeCloseTo(HKG.lon, 0);
  });
});

describe('USA → Asia (transpacific)', () => {
  it('LAX → NRT (heading ~305°, classic Pacific crossing)', () => {
    const { LAX, NRT } = AIRPORTS;
    // dLon = 140.39 - (-118.41) = 258.8 → normalized to -101.2°
    // |dLon| > 90, heading 305° → not going east → dLon stays negative (westward)
    const points = generateArc(LAX.lat, LAX.lon, NRT.lat, NRT.lon, 30, 305);
    // Route should cross date line (lon < -180 or > 180 at some point)
    const endLon = arcEndLon(points);
    // End should wrap around to ~140
    expect(Math.abs(endLon - NRT.lon) < 1 || Math.abs((endLon + 360) - NRT.lon) < 1 || Math.abs((endLon - 360) - NRT.lon) < 1).toBe(true);
  });

  it('JFK → SIN (heading ~350°, polar route)', () => {
    const { JFK, SIN } = AIRPORTS;
    const points = generateArc(JFK.lat, JFK.lon, SIN.lat, SIN.lon, 30, 350);
    expect(points).toHaveLength(31);
  });

  it('SFO → HKG westbound does not go east through Europe', () => {
    const SFO = { lat: 37.62, lon: -122.38 };
    const { HKG } = AIRPORTS;
    const points = generateArc(SFO.lat, SFO.lon, HKG.lat, HKG.lon, 30, 300);
    // Longitudes should decrease (go west) then wrap, never go east through Atlantic
    const midLon = points[Math.floor(points.length / 2)][1];
    // Midpoint should be west of SFO (more negative, i.e., over Pacific)
    expect(midLon).toBeLessThan(SFO.lon);
  });
});

describe('Russia → USA (transpolar/transpacific)', () => {
  it('SVO → JFK (heading ~310°, over Arctic/Atlantic)', () => {
    const { SVO, JFK } = AIRPORTS;
    // dLon = -73.78 - 37.41 = -111.19° → |dLon| > 90
    // heading 310° → goingEast=false → stays westward (correct)
    const points = generateArc(SVO.lat, SVO.lon, JFK.lat, JFK.lon, 30, 310);
    // Route goes westward from Moscow to JFK
    expect(normLon(arcEndLon(points))).toBeCloseTo(JFK.lon, 0);
  });

  it('SVO → LAX (heading ~330°, polar route)', () => {
    const { SVO, LAX } = AIRPORTS;
    const points = generateArc(SVO.lat, SVO.lon, LAX.lat, LAX.lon, 30, 330);
    expect(points).toHaveLength(31);
  });
});

describe('Russia → Canada', () => {
  it('SVO → YYZ (heading ~315°, over North Pole)', () => {
    const { SVO, YYZ } = AIRPORTS;
    // dLon = -79.63 - 37.41 = -117.04 → |dLon| > 90
    const points = generateArc(SVO.lat, SVO.lon, YYZ.lat, YYZ.lon, 30, 315);
    expect(normLon(arcEndLon(points))).toBeCloseTo(YYZ.lon, 0);
  });
});

// ─────────────────────────────────────────────────
// Eastbound long haul that must wrap the other way
// ─────────────────────────────────────────────────
describe('eastbound wrapping', () => {
  it('NRT → JFK eastbound via Pacific does NOT happen (heading 90)', () => {
    // If heading says east but shortest path is west, with dLon ~146° (> 90),
    // the heading override applies: goingEast + dLon < 0 → dLon += 360
    const { NRT, JFK } = AIRPORTS;
    const points = generateArc(NRT.lat, NRT.lon, JFK.lat, JFK.lon, 30, 90);
    // This creates an eastbound route wrapping around the globe
    // End longitude should still reach JFK area (possibly wrapped)
    expect(points).toHaveLength(31);
  });

  it('SYD → LAX (heading ~60°, eastbound Pacific)', () => {
    const { SYD, LAX } = AIRPORTS;
    // dLon = -118.41 - 151.18 = -269.59 → normalized to 90.41
    // heading 60° → goingEast → dLon is already positive → no flip needed
    const points = generateArc(SYD.lat, SYD.lon, LAX.lat, LAX.lon, 30, 60);
    expect(points).toHaveLength(31);
  });
});

// ─────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────
describe('edge cases', () => {
  it('same point produces a single location repeated', () => {
    const points = generateArc(50, 10, 50, 10, 5);
    for (const [lat, lon] of points) {
      expect(lat).toBeCloseTo(50);
      expect(lon).toBeCloseTo(10);
    }
  });

  it('heading exactly 0 (north) is not east', () => {
    const points = generateArc(50, 10, 60, 10, 5, 0);
    // dLon=0, no flip needed, heading 0 → goingEast=false but |dLon|<90 so no override
    expect(points[0][1]).toBeCloseTo(10);
    expect(arcEndLon(points)).toBeCloseTo(10);
  });

  it('heading exactly 180 (south) is not east', () => {
    const { BRU, CPT } = AIRPORTS;
    const points = generateArc(BRU.lat, BRU.lon, CPT.lat, CPT.lon, 20, 180);
    // Should go straight south, not wrap
    expect(maxLon(points)).toBeLessThan(30);
  });

  it('heading exactly 360 = north', () => {
    const points = generateArc(40, -74, 60, -74, 5, 360);
    // dLon=0, no issue
    expect(arcEndLon(points)).toBeCloseTo(-74);
  });

  it('antipodal points (London → Auckland)', () => {
    const { LHR, AKL } = AIRPORTS;
    const points = generateArc(LHR.lat, LHR.lon, AKL.lat, AKL.lon, 30, 50);
    expect(points).toHaveLength(31);
  });
});
