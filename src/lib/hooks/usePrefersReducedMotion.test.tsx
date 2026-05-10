// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface MqlMock {
  matches: boolean;
  addEventListener: (k: string, fn: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (k: string, fn: (e: MediaQueryListEvent) => void) => void;
  _trigger: (matches: boolean) => void;
}

function installMatchMedia(initial: boolean): MqlMock {
  let listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql: MqlMock = {
    matches: initial,
    addEventListener: (_k, fn) => { listeners.push(fn); },
    removeEventListener: (_k, fn) => { listeners = listeners.filter((l) => l !== fn); },
    _trigger: (m) => {
      mql.matches = m;
      const ev = { matches: m } as MediaQueryListEvent;
      listeners.forEach((l) => l(ev));
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => mql,
  });
  return mql;
}

describe('usePrefersReducedMotion', () => {
  beforeEach(() => {
    // Default to reset between tests.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns false initially when matchMedia is missing (SSR / older Safari)', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns the initial mql.matches value once mounted', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the OS-level preference flips', () => {
    const mql = installMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => { mql._trigger(true); });
    expect(result.current).toBe(true);

    act(() => { mql._trigger(false); });
    expect(result.current).toBe(false);
  });

  it('cleans up its listener on unmount', () => {
    const mql = installMatchMedia(false);
    const removeSpy = vi.spyOn(mql, 'removeEventListener');
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    unmount();
    expect(removeSpy).toHaveBeenCalledOnce();
  });
});
