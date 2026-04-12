import { API } from '@/lib/constants';
import { apiFetch } from '@/lib/apiFetch';
import { AIRLABS_FLIGHT_FIELDS, type AirlabsFlightResponse } from '@/lib/flights/airlabs';

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
    // Network error — no internet, proxy down, DNS failure, etc.
    const msg = err instanceof Error ? err.message : 'Unknown network error';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
      return { flights: [], error: 'network_error' };
    }
    return { flights: [], error: `proxy_error: ${msg}` };
  }

  if (response.status === 429) {
    return { flights: [], error: 'rate_limited' };
  }

  if (!response.ok) {
    if (response.status >= 500) {
      return { flights: [], error: 'proxy_error' };
    }
    return { flights: [], error: `http_${response.status}` };
  }

  let data: { response?: AirlabsFlightResponse[]; error?: { message: string; code: string } };
  try {
    data = await response.json();
  } catch {
    return { flights: [], error: 'proxy_error' };
  }

  // Airlabs returns 200 with error object when limits are exceeded
  if (data.error) {
    console.error(`[AirWatch] API Error [${data.error.code}]: ${data.error.message}`);
    return { flights: [], error: data.error.code ?? 'api_error' };
  }

  return { flights: Array.isArray(data.response) ? data.response : [], error: null };
}
