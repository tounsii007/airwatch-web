/** Shape consumed by deck.gl layers and the animation hook. */
export interface TripPoint {
  /** [lon, lat, altitudeMeters] — the order deck.gl expects. */
  position: [number, number, number];
  /** ms since the trip started (not epoch). */
  tMs: number;
  headingDeg: number;
  speedMs: number;
  verticalSpeedMs: number;
}

export interface TripData {
  icao24: string;
  callsign: string | null;
  points: TripPoint[];
  /** Epoch ms of point[0] — for HUD timestamps. */
  startEpochMs: number;
  /** ms between the first and last point. */
  durationMs: number;
}
