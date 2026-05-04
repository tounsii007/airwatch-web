'use client';

import { useMemo } from 'react';
import type { FavoriteItem } from '@/lib/types';

/** Newest first, with pinned items always sorted on top. */
function compareFavorites(a: FavoriteItem, b: FavoriteItem): number {
  if (a.pinned && !b.pinned) return -1;
  if (!a.pinned && b.pinned) return 1;
  return b.addedAt - a.addedAt;
}

function byType(items: readonly FavoriteItem[], type: FavoriteItem['type']) {
  return items.filter((i) => i.type === type && !i.pinned);
}

/** Groups favorites into pinned + per-type buckets for rendering sections. */
export function useSavedGroups(items: readonly FavoriteItem[]) {
  return useMemo(() => {
    const sorted = [...items].sort(compareFavorites);
    return {
      sorted,
      pinned: sorted.filter((i) => i.pinned),
      flights: byType(sorted, 'flight'),
      airports: byType(sorted, 'airport'),
      airlines: byType(sorted, 'airline'),
    };
  }, [items]);
}
