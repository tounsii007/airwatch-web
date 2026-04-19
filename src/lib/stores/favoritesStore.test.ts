import { beforeEach, describe, expect, it } from 'vitest';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import type { FavoriteItem } from '@/lib/types';

const makeItem = (id: string, overrides: Partial<FavoriteItem> = {}): FavoriteItem => ({
  id,
  type: 'flight',
  label: `Flight ${id}`,
  addedAt: Date.now(),
  ...overrides,
});

describe('useFavoritesStore', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ items: [] });
  });

  it('adds a favorite', () => {
    useFavoritesStore.getState().addFavorite(makeItem('a'));
    expect(useFavoritesStore.getState().items).toHaveLength(1);
    expect(useFavoritesStore.getState().isFavorite('a')).toBe(true);
  });

  it('does not add duplicates', () => {
    const { addFavorite } = useFavoritesStore.getState();
    addFavorite(makeItem('a'));
    addFavorite(makeItem('a'));
    expect(useFavoritesStore.getState().items).toHaveLength(1);
  });

  it('removes a favorite', () => {
    const { addFavorite, removeFavorite } = useFavoritesStore.getState();
    addFavorite(makeItem('a'));
    addFavorite(makeItem('b'));
    removeFavorite('a');
    const items = useFavoritesStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('b');
  });

  it('toggleFavorite adds then removes', () => {
    const { toggleFavorite } = useFavoritesStore.getState();
    toggleFavorite(makeItem('a'));
    expect(useFavoritesStore.getState().isFavorite('a')).toBe(true);
    toggleFavorite(makeItem('a'));
    expect(useFavoritesStore.getState().isFavorite('a')).toBe(false);
  });

  it('togglePin flips pinned flag', () => {
    const { addFavorite, togglePin } = useFavoritesStore.getState();
    addFavorite(makeItem('a'));
    togglePin('a');
    expect(useFavoritesStore.getState().items[0].pinned).toBe(true);
    togglePin('a');
    expect(useFavoritesStore.getState().items[0].pinned).toBe(false);
  });

  it('isFavorite returns false for unknown ids', () => {
    expect(useFavoritesStore.getState().isFavorite('nope')).toBe(false);
  });
});
