/**
 * Zod schemas + types for the Airlabs proxy endpoints exposed by
 * {@code AirlabsCatalogProxyController} and {@code AirlabsLookupProxyController}.
 *
 * <h3>Why one file</h3>
 * Each schema is small (Airlabs payloads have flat field shapes), and they
 * all share the same {@code response[]} envelope wrapper. Bundling them
 * keeps the related contracts side-by-side; if a field name shifts upstream,
 * the diff is one localized change.
 *
 * <h3>Why {@code .passthrough()}</h3>
 * Airlabs occasionally adds new fields without notice. Passthrough lets
 * those flow into the parsed object so a backend update doesn't silently
 * drop newly-shipped data.
 */

import { z } from 'zod';

// ═══ Envelope wrapper — every Airlabs endpoint shares this shape ═══

/** Shared error shape — Airlabs returns {error: {code, message}} on quota / param failures. */
const AirlabsErrorSchema = z
  .object({ code: z.string().optional(), message: z.string().optional() })
  .optional();

/**
 * Build a typed envelope schema around an item type. The payload is
 * always {@code {response: T[], error?: ...}} — this helper saves
 * repeating the wrapper for every endpoint.
 */
function envelope<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    response: z.array(item).optional(),
    error: AirlabsErrorSchema,
  });
}

// ═══ Reference data ═══

export const AirlineSchema = z
  .object({
    iata_code:           z.string().nullable().optional(),
    icao_code:           z.string().nullable().optional(),
    name:                z.string().optional(),
    country_code:        z.string().nullable().optional(),
    callsign:            z.string().nullable().optional(),
    fleet_size:          z.number().nullable().optional(),
    fleet_average_age:   z.number().nullable().optional(),
    date_founded:        z.union([z.string(), z.number()]).nullable().optional(),
    is_scheduled:        z.boolean().nullable().optional(),
    is_passenger:        z.boolean().nullable().optional(),
    is_cargo:            z.boolean().nullable().optional(),
    is_international:    z.boolean().nullable().optional(),
    iata_prefix_accounting: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();
export type Airline = z.infer<typeof AirlineSchema>;
export const AirlinesEnvelope = envelope(AirlineSchema);

export const CitySchema = z
  .object({
    city_code:    z.string().optional(),
    name:         z.string().optional(),
    country_code: z.string().optional(),
    lat:          z.number().nullable().optional(),
    lng:          z.number().nullable().optional(),
    timezone:     z.string().nullable().optional(),
    population:   z.number().nullable().optional(),
  })
  .passthrough();
export type City = z.infer<typeof CitySchema>;
export const CitiesEnvelope = envelope(CitySchema);

export const CountrySchema = z
  .object({
    country_code:  z.string().optional(),
    code3:         z.string().nullable().optional(),
    name:          z.string().optional(),
    population:    z.number().nullable().optional(),
    continent:     z.string().nullable().optional(),
    currency_code: z.string().nullable().optional(),
    currency_name: z.string().nullable().optional(),
    capital:       z.string().nullable().optional(),
    /** Direct-dial telephone prefix (e.g. "+49"). Often arrives as number. */
    phone:         z.union([z.string(), z.number()]).nullable().optional(),
    /** Flag emoji from the upstream catalogue. */
    flag:          z.string().nullable().optional(),
  })
  .passthrough();
export type Country = z.infer<typeof CountrySchema>;
export const CountriesEnvelope = envelope(CountrySchema);

export const TimezoneSchema = z
  .object({
    code:        z.string().optional(),
    name:        z.string().optional(),
    /** Hours offset from UTC (e.g. 1 for CET, -5 for EST). */
    gmt:         z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();
export type Timezone = z.infer<typeof TimezoneSchema>;
export const TimezonesEnvelope = envelope(TimezoneSchema);

export const TaxSchema = z
  .object({
    iata_code:    z.string().optional(),
    name:         z.string().optional(),
    description:  z.string().optional(),
  })
  .passthrough();
export type Tax = z.infer<typeof TaxSchema>;
export const TaxesEnvelope = envelope(TaxSchema);

/**
 * Aviation codes — used to render alliance badges. The shape is
 * intentionally loose because Airlabs returns a heterogeneous bag
 * of objects (Star Alliance, oneworld, SkyTeam, accounting prefixes)
 * each with slightly different keys.
 */
export const AviationCodeSchema = z.record(z.string(), z.unknown());
export type AviationCode = z.infer<typeof AviationCodeSchema>;
export const AviationCodesEnvelope = envelope(AviationCodeSchema);

// ═══ Per-resource lookups ═══

export const AircraftSchema = z
  .object({
    reg_number:         z.string().optional(),
    iata_code_short:    z.string().nullable().optional(),
    iata_code_long:     z.string().nullable().optional(),
    icao_code:          z.string().nullable().optional(),
    icao_24bit:         z.string().nullable().optional(),
    model_name:         z.string().nullable().optional(),
    airline_iata:       z.string().nullable().optional(),
    airline_icao:       z.string().nullable().optional(),
    construction_number: z.string().nullable().optional(),
    delivery_date:      z.string().nullable().optional(),
    test_reg_number:    z.string().nullable().optional(),
    rollout_date:       z.string().nullable().optional(),
    first_flight_date:  z.string().nullable().optional(),
    seats:              z.number().nullable().optional(),
    engine:             z.string().nullable().optional(),
    engines_count:      z.number().nullable().optional(),
    plane_age:          z.number().nullable().optional(),
    plane_status:       z.string().nullable().optional(),
    plane_owner:        z.string().nullable().optional(),
    line_number:        z.string().nullable().optional(),
  })
  .passthrough();
export type Aircraft = z.infer<typeof AircraftSchema>;
export const AircraftEnvelope = envelope(AircraftSchema);

export const FleetSchema = z
  .object({
    reg_number:    z.string().optional(),
    icao_24bit:    z.string().nullable().optional(),
    plane_owner:   z.string().nullable().optional(),
    iata_type:     z.string().nullable().optional(),
    icao_type:     z.string().nullable().optional(),
    model_name:    z.string().nullable().optional(),
    construction_number: z.string().nullable().optional(),
    delivery_date: z.string().nullable().optional(),
    plane_age:     z.number().nullable().optional(),
  })
  .passthrough();
export type Fleet = z.infer<typeof FleetSchema>;
export const FleetsEnvelope = envelope(FleetSchema);

export const WikiSchema = z
  .object({
    /** Plain-text summary, usually 3-5 sentences. */
    summary:    z.string().nullable().optional(),
    /** Direct URL to the canonical Wikipedia page. */
    wiki_url:   z.string().nullable().optional(),
    /** Lead-image URL — may be null for niche entities. */
    image_url:  z.string().nullable().optional(),
    /** Image attribution (Wikipedia author / Commons license). */
    image_attribution: z.string().nullable().optional(),
  })
  .passthrough();
export type Wiki = z.infer<typeof WikiSchema>;
/** Wiki responses come as a single object, not an array — bespoke envelope. */
export const WikiEnvelope = z.object({
  response: WikiSchema.optional(),
  error: AirlabsErrorSchema,
});

// ═══ Search ═══

export const SuggestItemSchema = z
  .object({
    /** "airport" | "airline" | "city" — discriminates how to render the row. */
    type: z.string().optional(),
    name: z.string().optional(),
    iata: z.string().nullable().optional(),
    icao: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    /** Relevance score from upstream — higher = better match. */
    score: z.number().nullable().optional(),
  })
  .passthrough();
export type SuggestItem = z.infer<typeof SuggestItemSchema>;
export const SuggestEnvelope = envelope(SuggestItemSchema);

// ═══ Live data (delays + cargos) ═══

export const DelayedFlightSchema = z
  .object({
    flight_iata:    z.string().nullable().optional(),
    flight_icao:    z.string().nullable().optional(),
    flight_number:  z.string().nullable().optional(),
    airline_iata:   z.string().nullable().optional(),
    airline_icao:   z.string().nullable().optional(),
    dep_iata:       z.string().nullable().optional(),
    dep_icao:       z.string().nullable().optional(),
    dep_terminal:   z.string().nullable().optional(),
    dep_gate:       z.string().nullable().optional(),
    dep_time:       z.string().nullable().optional(),
    dep_estimated:  z.string().nullable().optional(),
    arr_iata:       z.string().nullable().optional(),
    arr_icao:       z.string().nullable().optional(),
    arr_terminal:   z.string().nullable().optional(),
    arr_gate:       z.string().nullable().optional(),
    arr_time:       z.string().nullable().optional(),
    arr_estimated:  z.string().nullable().optional(),
    /** Delay in minutes. Always positive when present. */
    delayed:        z.number().nullable().optional(),
    arr_delayed:    z.number().nullable().optional(),
    status:         z.string().nullable().optional(),
    /** Codeshare partner — present when this flight is sold under another brand. */
    cs_airline_iata: z.string().nullable().optional(),
    cs_flight_iata:  z.string().nullable().optional(),
    cs_flight_number: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();
export type DelayedFlight = z.infer<typeof DelayedFlightSchema>;
export const DelaysEnvelope = envelope(DelayedFlightSchema);

/** Cargo flights share the live-flight shape — reuse the existing schema. */
export { AirlabsFlightSchema as CargoFlightSchema, AirlabsFlightsResponseSchema as CargosEnvelope } from '@/lib/schemas';
