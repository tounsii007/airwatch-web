import { PathLayer } from '@deck.gl/layers';
import { altitudeColorRgba } from '@/components/replay3d/altitudeColor';
import type { TripData, TripPoint } from '@/components/replay3d/types';

interface Segment {
  from: TripPoint;
  to: TripPoint;
}

function toSegments(points: readonly TripPoint[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) out.push({ from: points[i], to: points[i + 1] });
  return out;
}

/**
 * Static colored track under the moving trail. One PathLayer segment per
 * position pair → per-segment altitude color without tesselating on the CPU.
 */
export function buildStaticTrackLayer(trip: TripData) {
  return new PathLayer<Segment>({
    id: `replay-track-${trip.icao24}`,
    data: toSegments(trip.points),
    getPath: (s) => [s.from.position, s.to.position],
    getColor: (s) => altitudeColorRgba((s.from.position[2] + s.to.position[2]) / 2, 160),
    getWidth: 2,
    widthMinPixels: 1,
    widthUnits: 'pixels',
    opacity: 0.55,
  });
}
