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

  // ─── 500-item cap (audit P1-8) ────────────────────────────────────

  it('caps the items list at 500 — adding past the cap drops the oldest non-pinned', () => {
    const { addFavorite } = useFavoritesStore.getState();
    for (let i = 0; i < 500; i++) addFavorite(makeItem(`f${i}`));
    expect(useFavoritesStore.getState().items).toHaveLength(500);

    addFavorite(makeItem('f500'));
    const items = useFavoritesStore.getState().items;
    expect(items).toHaveLength(500);
    expect(items.some((i) => i.id === 'f0')).toBe(false);   // dropped
    expect(items.some((i) => i.id === 'f500')).toBe(true);  // added
  });

  it('pinned entries are NEVER evicted by the cap', () => {
    const { addFavorite, togglePin } = useFavoritesStore.getState();
    for (let i = 0; i < 500; i++) addFavorite(makeItem(`f${i}`));
    togglePin('f0'); // pin the oldest

    addFavorite(makeItem('f500'));
    const items = useFavoritesStore.getState().items;
    expect(items.some((i) => i.id === 'f0' && i.pinned)).toBe(true);
    // The next-oldest non-pinned (f1) was evicted instead.
    expect(items.some((i) => i.id === 'f1')).toBe(false);
    expect(items.some((i) => i.id === 'f500')).toBe(true);
  });

  it('refuses to grow past the cap when every entry is pinned', () => {
    const { addFavorite, togglePin } = useFavoritesStore.getState();
    for (let i = 0; i < 500; i++) {
      addFavorite(makeItem(`p${i}`));
      togglePin(`p${i}`);
    }
    addFavorite(makeItem('newcomer'));
    const items = useFavoritesStore.getState().items;
    expect(items).toHaveLength(500);
    expect(items.some((i) => i.id === 'newcomer')).toBe(false);
  });
});
