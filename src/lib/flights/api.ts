import { API } from '@/lib/constants';
import { apiFetch } from '@/lib/apiFetch';
import { AIRLABS_FLIGHT_FIELDS, type AirlabsFlightResponse } from '@/lib/flights/airlabs';
import { AirlabsFlightsResponseSchema, safeParseArray } from '@/lib/schemas';

export interface FlightFetchResult {
  error: string | null;
  flights: AirlabsFlightResponse[];
}

export async function fetchAirlabsFlights(fetchImpl: typeof fetch = fetch): Promise<FlightFetchResult> {
  let response: Response;
  try {
    const fetcher = fetchImpl === fetch ? apiFetch : fetchImpl;
    response = await fetcher(API.flights(`_fields=${AIRLABS_FLIGHT_FIELDS}`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown network error';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
      return { flights: [], error: 'network_error' };
    }
    return { flights: [], error: `proxy_error: ${msg}` };
  }

  if (response.status === 429) return { flights: [], error: 'rate_limited' };
  if (!response.ok) {
    if (response.status >= 500) return { flights: [], error: 'proxy_error' };
    return { flights: [], error: `http_${response.status}` };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return { flights: [], error: 'proxy_error' };
  }

  // Validate the envelope shape first.
  const envelope = AirlabsFlightsResponseSchema.safeParse(raw);
  if (!envelope.success) {
    // eslint-disable-next-line no-console
    console.error('[flights/api] malformed response envelope', envelope.error.issues.slice(0, 3));
    return { flights: [], error: 'schema_error' };
  }

  // Airlabs may return 200 with an error object when limits are exceeded.
  if (envelope.data.error) {
    return { flights: [], error: envelope.data.error.code ?? 'api_error' };
  }

  // Each flight parsed individually — one bad row doesn't kill the whole batch.
  // (We return AirlabsFlightResponse for backward compatibility with legacy consumers.
  // The Zod schema passes `.passthrough()` so the inferred shape is a superset of this type.)
  const { items } = safeParseArray(
    AirlabsFlightsResponseSchema.shape.response.unwrap().element,
    envelope.data.response ?? [],
    'airlabs/flights',
  );
  return { flights: items as unknown as AirlabsFlightResponse[], error: null };
}
