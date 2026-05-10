import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FavoriteItem } from '@/lib/types';

/**
 * Hard cap on the number of favourites a single user can hold. Past
 * this point, the oldest non-pinned entry is dropped to make room for
 * the new one — pinned entries are never evicted.
 *
 * Why a cap: the store is persisted to localStorage which has a hard
 * 5–10 MB browser quota. A user who star-clicks every flight they see
 * across a few months would accumulate thousands of entries; at ~200
 * bytes each that's still small but grows the JSON serialisation cost
 * on every persist. statsStore + geofenceStore already have explicit
 * caps; favorites was the outlier.
 */
const MAX_ITEMS = 500;

interface FavoritesStoreState {
  items: FavoriteItem[];
}

interface FavoritesStoreActions {
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (item: FavoriteItem) => void;
  togglePin: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

type FavoritesStore = FavoritesStoreState & FavoritesStoreActions;

/**
 * Append `item` and, when over MAX_ITEMS, drop the OLDEST non-pinned
 * entry. Pinned entries always survive — that's the user's "this
 * matters" signal. Pure function so the store + tests both call it.
 */
export function _appendWithCap(items: FavoriteItem[], item: FavoriteItem): FavoriteItem[] {
  const next = [...items, item];
  if (next.length <= MAX_ITEMS) return next;

  // Find the first non-pinned entry to drop. items is mutation-ordered
  // (oldest first) so the first non-pinned wins.
  for (let i = 0; i < next.length; i++) {
    if (!next[i].pinned) {
      return next.slice(0, i).concat(next.slice(i + 1));
    }
  }
  // Every entry is pinned. Refuse to grow past the cap by dropping
  // the new item — pinned entries are sacred.
  return items;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      addFavorite: (item: FavoriteItem) => {
        const { items } = get();
        if (items.some((f) => f.id === item.id)) return;
        set({ items: _appendWithCap(items, item) });
      },

      removeFavorite: (id: string) => {
        set({ items: get().items.filter((f) => f.id !== id) });
      },

      toggleFavorite: (item: FavoriteItem) => {
        const { items } = get();
        if (items.some((f) => f.id === item.id)) {
          set({ items: items.filter((f) => f.id !== item.id) });
        } else {
          set({ items: _appendWithCap(items, item) });
        }
      },

      togglePin: (id: string) => {
        set({ items: get().items.map((f) => f.id === id ? { ...f, pinned: !f.pinned } : f) });
      },

      isFavorite: (id: string) => {
        return get().items.some((f) => f.id === id);
      },
    }),
    {
      name: 'airwatch-favorites',
    }
  )
);
