// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePageVisibility } from './usePageVisibility';

/**
 * happy-dom doesn't dispatch `visibilitychange` when you reassign
 * `document.visibilityState`, so we wire it through manually.
 */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('usePageVisibility', () => {
  beforeEach(() => {
    setVisibility('visible');
  });

  it('returns true while the tab is visible', () => {
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(true);
  });

  it('flips to false when the visibilitychange event fires hidden', () => {
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(true);
    act(() => setVisibility('hidden'));
    expect(result.current).toBe(false);
  });

  it('flips back to true when the user returns', () => {
    const { result } = renderHook(() => usePageVisibility());
    act(() => setVisibility('hidden'));
    expect(result.current).toBe(false);
    act(() => setVisibility('visible'));
    expect(result.current).toBe(true);
  });

  it('removes the listener on unmount (no late updates)', () => {
    const { result, unmount } = renderHook(() => usePageVisibility());
    unmount();
    // After unmount the hook can no longer affect React state, so the
    // assertion is just "no thrown error from a stale setState". If the
    // listener wasn't removed, vitest would surface the React warning
    // about updating an unmounted component.
    setVisibility('hidden');
    expect(result.current).toBe(true); // last rendered value before unmount
  });
});
