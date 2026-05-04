'use client';

/**
 * Client-side fuzzy search over the airports.json index that's already
 * loaded by GlobalEffects on mount. No server round-trip — the dataset
 * is < 600 KB gzipped, lives in memory, and lookups are O(N) over ~9k
 * entries (unobservable < 1 ms).
 *
 * Match strategy (in order, first match wins per entry):
 *   1. IATA prefix match — "FR" → FRA, FRJ, FRM, ...
 *   2. City prefix match — "fra" → Frankfurt, Fraser, ...
 *   3. City contains   — "burg" → Hamburg, St. Petersburg, ...
 *
 * Results are capped at MAX_RESULTS so the dropdown stays usable on
 * mobile and React's reconciler doesn't waste cycles on entries the
 * user can't see.
 */
import { useMemo } from 'react';
import { AIRPORTS, type AirportRecord } from '@/lib/data/airports';

export interface AirportSearchResult {
  iata: string;
  name: string;
  country: string;
  /** 0 = exact IATA prefix, 1 = city prefix, 2 = city contains. */
  rank: 0 | 1 | 2;
}

const MAX_RESULTS = 8;
const MIN_QUERY = 1;

export function useAirportSearch(query: string): AirportSearchResult[] {
  return useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) return [];

    const upper = trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();
    const results: AirportSearchResult[] = [];

    // Single pass through the index — O(N) but N ≈ 9000 and the body
    // does only string comparisons. No regex, no normalization, no
    // allocation per iteration.
    const entries = Object.entries(AIRPORTS) as Array<[string, AirportRecord]>;
    for (const [iata, record] of entries) {
      let rank: 0 | 1 | 2 | -1 = -1;
      if (iata.startsWith(upper)) rank = 0;
      else if (record.n && record.n.toLowerCase().startsWith(lower)) rank = 1;
      else if (record.n && record.n.toLowerCase().includes(lower)) rank = 2;
      if (rank === -1) continue;

      results.push({ iata, name: record.n, country: record.c, rank });
      // Early exit when we already have enough rank-0 hits.
      if (results.length >= MAX_RESULTS * 3) break;
    }

    // Sort by rank then alphabetically by IATA so the order is stable.
    results.sort((a, b) => a.rank - b.rank || a.iata.localeCompare(b.iata));
    return results.slice(0, MAX_RESULTS);
  }, [query]);
}
