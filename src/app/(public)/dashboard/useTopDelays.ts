'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/constants';
import { fetchAirlabsArray } from '@/lib/airlabs/fetch';
import { DelayedFlightSchema, type DelayedFlight } from '@/lib/airlabs/schemas';

export type DelaysType = 'departures' | 'arrivals';

export interface TopDelaysState {
  flights: DelayedFlight[];
  loading: boolean;
  /** {@code null} on the happy path; one of the AirlabsError codes otherwise. */
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch the top-N currently-delayed flights from the backend
 * {@code /api/proxy/airlabs/delays} endpoint.
 *
 * <h3>Refresh policy</h3>
 * Auto-refreshes every 60 s — matches the backend cache TTL on the
 * {@code delays} cache. Anything more frequent would be a wasted call.
 * Manual refresh is exposed for user-initiated retries (UI button).
 *
 * <h3>Sort + cap</h3>
 * Sorts by the {@code delayed} field descending, takes the top {@code limit}.
 * The Airlabs response is unsorted; doing it here keeps the widget
 * deterministic across upstream ordering changes.
 */
export function useTopDelays(type: DelaysType, limit = 10): TopDelaysState {
  const [flights, setFlights] = useState<DelayedFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setLoading(true);
      const result = await fetchAirlabsArray(
        API.delays(type),
        DelayedFlightSchema,
        `delays:${type}`,
      );
      if (cancelled || controller.signal.aborted) return;

      if (!result.ok) {
        setError(result.error);
        setFlights([]);
      } else {
        setError(null);
        const sorted = [...result.items]
          .filter((f) => (f.delayed ?? 0) > 0)
          .sort((a, b) => (b.delayed ?? 0) - (a.delayed ?? 0))
          .slice(0, limit);
        setFlights(sorted);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [type, limit, tick]);

  // Auto-refresh every 60 s — matches backend cache TTL.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return { flights, loading, error, refresh: () => setTick((n) => n + 1) };
}
