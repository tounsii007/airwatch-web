import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FavoriteItem } from '@/lib/types';

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

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      addFavorite: (item: FavoriteItem) => {
        const { items } = get();
        if (items.some((f) => f.id === item.id)) return;
        set({ items: [...items, item] });
      },

      removeFavorite: (id: string) => {
        set({ items: get().items.filter((f) => f.id !== id) });
      },

      toggleFavorite: (item: FavoriteItem) => {
        const { items } = get();
        if (items.some((f) => f.id === item.id)) {
          set({ items: items.filter((f) => f.id !== item.id) });
        } else {
          set({ items: [...items, item] });
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
