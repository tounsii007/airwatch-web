import type { FlightPosition } from '@/lib/schemas';
import type { TripData, TripPoint } from '@/components/replay3d/types';

function parseTime(iso: string): number {
  return Date.parse(iso);
}

function toTripPoint(p: FlightPosition, startEpoch: number): TripPoint {
  return {
    position: [p.longitude, p.latitude, p.altitude],
    tMs: parseTime(p.timestamp) - startEpoch,
    headingDeg: p.heading,
    speedMs: p.speed,
    verticalSpeedMs: p.verticalSpeed,
  };
}

function byTimestamp(a: FlightPosition, b: FlightPosition): number {
  return parseTime(a.timestamp) - parseTime(b.timestamp);
}

/** Build an animatable trip from raw position history. Pure, testable. */
export function buildTripData(positions: readonly FlightPosition[]): TripData | null {
  if (positions.length < 2) return null;
  const sorted = [...positions].sort(byTimestamp);
  const startEpoch = parseTime(sorted[0].timestamp);
  const endEpoch = parseTime(sorted[sorted.length - 1].timestamp);
  return {
    icao24: sorted[0].icao24,
    callsign: sorted[0].callsign ?? null,
    points: sorted.map((p) => toTripPoint(p, startEpoch)),
    startEpochMs: startEpoch,
    durationMs: endEpoch - startEpoch,
  };
}
