'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/constants';
import { fetchAirlabsArray } from '@/lib/airlabs/fetch';
import { SuggestItemSchema, type SuggestItem } from '@/lib/airlabs/schemas';

/**
 * Debounced autocomplete hook backed by the Airlabs {@code /suggest}
 * endpoint. Returns airports + airlines + cities matching the query.
 *
 * <h3>Debounce + min-length</h3>
 * Skips the network for queries shorter than 2 chars (noisy + cheap
 * client-side filter elsewhere covers that case). Debounces user input
 * by {@code debounceMs} so a typing user doesn't fire one HTTP call per
 * keystroke — keeps the Airlabs quota intact.
 *
 * <h3>Fail-soft</h3>
 * On error returns an empty list. The autocomplete dropdown is purely
 * additive — falling back to "no extra suggestions" is the right UX,
 * not surfacing an error toast on every keystroke.
 */
export function useAirlabsSuggest(query: string, debounceMs = 300): {
  items: SuggestItem[];
  loading: boolean;
} {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setItems([]); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      const result = await fetchAirlabsArray(API.suggest(q), SuggestItemSchema, 'suggest');
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setItems(result.items.slice(0, 8));
      else setItems([]);
    }, debounceMs);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, debounceMs]);

  return { items, loading };
}
