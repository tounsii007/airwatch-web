/**
 * Zod schemas for every API-boundary payload. Parse at the boundary so a
 * backend contract drift surfaces as an immediate, located error instead
 * of a mysterious undefined three components deep.
 *
 * All types are inferred from the schemas — no duplicate hand-typed shape.
 */

import { z } from 'zod';

// ═══ Airlabs live feed (proxy → Airlabs /v9/flights) ═══
// Field names match Airlabs. Backend's Aircraft.java serializes into the
// same shape thanks to its @JsonProperty("hex") aliases.
export const AirlabsFlightSchema = z
  .object({
    hex: z.string().optional(),
    reg_number: z.string().optional(),
    flag: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    alt: z.number().optional(),
    dir: z.number().optional(),
    speed: z.number().optional(),
    v_speed: z.number().optional(),
    squawk: z.string().optional(),
    flight_icao: z.string().optional(),
    flight_iata: z.string().optional(),
    flight_number: z.string().optional(),
    airline_icao: z.string().optional(),
    airline_iata: z.string().optional(),
    aircraft_icao: z.string().optional(),
    dep_icao: z.string().optional(),
    dep_iata: z.string().optional(),
    arr_icao: z.string().optional(),
    arr_iata: z.string().optional(),
    status: z.string().optional(),
    updated: z.number().optional(),
  })
  .passthrough(); // tolerate extra fields the backend adds
export type AirlabsFlight = z.infer<typeof AirlabsFlightSchema>;

export const AirlabsFlightsResponseSchema = z.object({
  response: z.array(AirlabsFlightSchema).optional(),
  error: z
    .object({ code: z.string().optional(), message: z.string().optional() })
    .optional(),
});
export type AirlabsFlightsResponse = z.infer<typeof AirlabsFlightsResponseSchema>;

// ═══ GeoFences ═══
export const FenceTypeSchema = z.enum(['CIRCLE', 'RECTANGLE']);

export const GeoFenceSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(128),
  clientId: z.string().min(1).max(128),
  type: FenceTypeSchema,
  centerLat: z.number().gte(-90).lte(90).optional(),
  centerLon: z.number().gte(-180).lte(180).optional(),
  radiusKm: z.number().positive().optional(),
  northLat: z.number().gte(-90).lte(90).optional(),
  southLat: z.number().gte(-90).lte(90).optional(),
  eastLon: z.number().gte(-180).lte(180).optional(),
  westLon: z.number().gte(-180).lte(180).optional(),
  minAltitudeFt: z.number().int().nullable().optional(),
  maxAltitudeFt: z.number().int().nullable().optional(),
  airlineFilter: z.string().nullable().optional(),
  active: z.boolean().optional(),
});
export type GeoFence = z.infer<typeof GeoFenceSchema>;

export const GeoFenceAlertSchema = z.object({
  fenceId: z.number(),
  fenceName: z.string(),
  icao24: z.string(),
  callsign: z.string().optional().nullable(),
  airlineIcao: z.string().optional().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number(),
  speed: z.number(),
  timestamp: z.string(), // ISO instant
});
export type GeoFenceAlert = z.infer<typeof GeoFenceAlertSchema>;

// ═══ Flight replay ═══
export const FlightPositionSchema = z.object({
  id: z.number(),
  icao24: z.string(),
  callsign: z.string().optional().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number(),
  speed: z.number(),
  heading: z.number(),
  verticalSpeed: z.number(),
  squawk: z.string().optional().nullable(),
  timestamp: z.string(),
});
export type FlightPosition = z.infer<typeof FlightPositionSchema>;

export const ReplayInfoSchema = z.object({
  icao24: z.string(),
  callsign: z.string(),
  positions: z.number(),
  from: z.string(),
  to: z.string(),
  durationMinutes: z.number(),
});
export type ReplayInfo = z.infer<typeof ReplayInfoSchema>;

// ═══ Safe-parse helper ═══
/**
 * Parse a value against a schema. On failure, log the issue and return null
 * so callers can fall through to a sensible default without crashing the UI.
 *
 * Use this instead of `schema.parse()` at fetch boundaries where the backend
 * is authoritative but we don't want a single bad record to kill the view.
 */
export function safeParse<T>(schema: z.ZodType<T>, value: unknown, label?: string): T | null {
  const result = schema.safeParse(value);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error(`[schema:${label ?? 'unknown'}]`, result.error.issues.slice(0, 3));
    return null;
  }
  return result.data;
}

/**
 * Parse an array where individual bad entries get dropped but the rest stream through.
 * Returns (parsed array, count of dropped entries).
 */
export function safeParseArray<T>(
  schema: z.ZodType<T>,
  value: unknown,
  label?: string,
): { items: T[]; dropped: number } {
  if (!Array.isArray(value)) return { items: [], dropped: 0 };
  const items: T[] = [];
  let dropped = 0;
  for (const entry of value) {
    const r = schema.safeParse(entry);
    if (r.success) items.push(r.data);
    else dropped++;
  }
  if (dropped > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[schema:${label ?? 'unknown'}] dropped ${dropped} malformed entries`);
  }
  return { items, dropped };
}
