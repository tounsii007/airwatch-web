// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useEnsurePolling } from './useEnsurePolling';

describe('useEnsurePolling', () => {
  beforeEach(() => {
    // Reset to a state with no aircraft and a fresh spy on startPolling.
    useFlightStore.setState({ aircraftMap: new Map() });
  });

  it('calls startPolling exactly once when aircraftMap is empty on mount', () => {
    const spy = vi.fn();
    useFlightStore.setState({ startPolling: spy });
    renderHook(() => useEnsurePolling());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does NOT call startPolling when aircraftMap already has entries', () => {
    const spy = vi.fn();
    useFlightStore.setState({
      aircraftMap: new Map([['abc123', { icao24: 'abc123' } as never]]),
      startPolling: spy,
    });
    renderHook(() => useEnsurePolling());
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not double-call when re-rendered with the same empty state', () => {
    const spy = vi.fn();
    useFlightStore.setState({ startPolling: spy });
    const { rerender } = renderHook(() => useEnsurePolling());
    rerender();
    rerender();
    // The dep array is [size, startPolling]; both stable on re-renders
    // with no state changes, so the effect runs once.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
