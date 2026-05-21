// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useToastStore } from '@/components/ui/toast';
import { useFavoriteToggle } from './useFavoriteToggle';

describe('useFavoriteToggle', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ items: [] });
    useToastStore.setState({ toasts: [] });
  });

  it('adds the item on first invocation and fires a success toast', () => {
    const { result } = renderHook(() =>
      useFavoriteToggle({
        id: 'airline-DLH',
        type: 'airline',
        label: 'DLH',
        subtitle: 'Lufthansa',
      }),
    );
    act(() => result.current());
    expect(useFavoritesStore.getState().isFavorite('airline-DLH')).toBe(true);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe('Saved "Lufthansa"');
    expect(toasts[0].variant).toBe('success');
  });

  it('removes the item on second invocation and fires a default toast', () => {
    const { result } = renderHook(() =>
      useFavoriteToggle({
        id: 'airline-DLH',
        type: 'airline',
        label: 'DLH',
        subtitle: 'Lufthansa',
      }),
    );
    act(() => result.current());
    act(() => result.current());
    expect(useFavoritesStore.getState().isFavorite('airline-DLH')).toBe(false);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[1].title).toBe('Removed "Lufthansa"');
    expect(toasts[1].variant).toBe('default');
  });

  it('uses displayName for toast copy when provided', () => {
    const { result } = renderHook(() =>
      useFavoriteToggle({
        id: 'airport-FRA',
        type: 'airport',
        label: 'FRA',
        subtitle: 'Frankfurt Airport',
        displayName: 'Frankfurt',
      }),
    );
    act(() => result.current());
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].title).toBe('Saved "Frankfurt"');
  });

  it('falls back to label when no subtitle or displayName is set', () => {
    const { result } = renderHook(() =>
      useFavoriteToggle({
        id: 'airline-XYZ',
        type: 'airline',
        label: 'XYZ',
      }),
    );
    act(() => result.current());
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].title).toBe('Saved "XYZ"');
  });

  it('respects a custom toast duration', () => {
    const { result } = renderHook(() =>
      useFavoriteToggle({
        id: 'a',
        type: 'flight',
        label: 'A',
        toastDuration: 9999,
      }),
    );
    act(() => result.current());
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].duration).toBe(9999);
  });

  it('merges extras into the persisted favourite payload', () => {
    const { result } = renderHook(() =>
      useFavoriteToggle({
        id: 'flight-ABC',
        type: 'flight',
        label: 'ABC',
        extras: { airlineIata: 'LH', depIata: 'FRA', arrIata: 'JFK' },
      }),
    );
    act(() => result.current());
    const stored = useFavoritesStore.getState().items[0];
    expect(stored.airlineIata).toBe('LH');
    expect(stored.depIata).toBe('FRA');
    expect(stored.arrIata).toBe('JFK');
  });
});
