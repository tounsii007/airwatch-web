/**
 * Generate a great-circle arc between two points.
 *
 * The `heading` parameter resolves ambiguity for routes that could go
 * east or west around the globe.  It is ONLY used when the longitude
 * difference is large enough that the direction matters (> 90°).
 * For short/medium routes the shortest path is always taken.
 */
export function generateArc(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPoints: number,
  heading?: number
): [number, number][] {
  // Normalize to [-180, 180]
  let dLon = lon2 - lon1;
  while (dLon > 180) dLon -= 360;
  while (dLon < -180) dLon += 360;

  // Only override direction for genuinely ambiguous long routes (|dLon| > 90).
  // Short routes (BRU→DSS, heading 187°, dLon≈-14) should never be flipped.
  if (heading != null && Math.abs(dLon) > 90) {
    const goingEast = heading > 0 && heading < 180;
    if (goingEast && dLon < 0) dLon += 360;   // force eastward
    if (!goingEast && dLon > 0) dLon -= 360;  // force westward
  }

  // Great-circle approximation with latitude curve
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const lat = lat1 + (lat2 - lat1) * f;
    const lon = lon1 + dLon * f;
    // Subtle poleward curve for realism on long routes
    const midFactor = Math.sin(f * Math.PI);
    const avgLat = (lat1 + lat2) / 2;
    const curveAmount = Math.abs(dLon) > 40 ? Math.sign(avgLat || 1) * Math.abs(dLon) * 0.03 : 0;
    points.push([lat + curveAmount * midFactor, lon]);
  }

  return points;
}
