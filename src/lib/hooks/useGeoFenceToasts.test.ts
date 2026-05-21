/**
 * Tests for the geofence → toast bridge.
 *
 * The hook calls `toast.warning()` only for alerts that were pushed AFTER
 * the hook mounted; replayed/persisted alerts must remain silent so the
 * user isn't flooded on page load.
 *
 * These tests run in node environment (no DOM needed) because:
 *   * `useGeoFenceToasts` is a pure Zustand/React hook — no browser APIs.
 *   * We drive it via `renderHook` with mocked stores so the test stays
 *     fast and deterministic.
 */

// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useGeoFenceStore, type GeoFenceAlert } from '@/lib/stores/geofenceStore';
import { useToastStore } from '@/components/ui/toast';
import { useGeoFenceToasts } from './useGeoFenceToasts';

// ─── helpers ────────────────────────────────────────────────────────────────

const makeAlert = (overrides: Partial<GeoFenceAlert> = {}): GeoFenceAlert => ({
  fenceId: 1,
  fenceName: 'Alpha Zone',
  icao24: 'abc123',
  latitude: 50,
  longitude: 8,
  altitude: 11280,
  speed: 450,
  timestamp: new Date().toISOString(), // "now" — after mount
  ...overrides,
});

// ─── setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  useGeoFenceStore.setState({ alerts: [] });
  useToastStore.setState({ toasts: [] });
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe('useGeoFenceToasts', () => {
  it('fires a warning toast when a live alert is pushed', () => {
    const { result: _ } = renderHook(() => useGeoFenceToasts());

    act(() => {
      useGeoFenceStore.getState().pushAlert(makeAlert({ callsign: 'DLH123' }));
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].variant).toBe('warning');
    expect(toasts[0].title).toContain('DLH123');
    expect(toasts[0].title).toContain('Alpha Zone');
  });

  it('uses icao24 as the fallback identifier when callsign is absent', () => {
    renderHook(() => useGeoFenceToasts());

    act(() => {
      useGeoFenceStore.getState().pushAlert(makeAlert({ callsign: undefined }));
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].title).toContain('ABC123');
  });

  it('does NOT fire a toast for alerts older than mount time', () => {
    // Simulate an alert that was persisted from a previous session by
    // giving it a timestamp well before the hook mounts.
    const oldTimestamp = new Date(Date.now() - 60_000).toISOString();

    // Pre-populate the store BEFORE mounting the hook so the alert
    // pre-dates mountedAtRef.
    useGeoFenceStore.setState({ alerts: [makeAlert({ timestamp: oldTimestamp })] });

    renderHook(() => useGeoFenceToasts());

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('does NOT fire duplicate toasts for the same (icao24, fenceId)', () => {
    renderHook(() => useGeoFenceToasts());

    act(() => {
      useGeoFenceStore.getState().pushAlert(makeAlert({ callsign: 'TU744' }));
    });

    // Pushing the same flight again (deduplication replaces in store but
    // our toastedRef should prevent a second toast).
    act(() => {
      useGeoFenceStore.getState().pushAlert(makeAlert({ callsign: 'TU744' }));
    });

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('fires separate toasts for different fences', () => {
    renderHook(() => useGeoFenceToasts());

    act(() => {
      useGeoFenceStore.getState().pushAlert(makeAlert({ fenceId: 1, fenceName: 'Zone A' }));
      useGeoFenceStore.getState().pushAlert(makeAlert({ fenceId: 2, fenceName: 'Zone B' }));
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    const titles = toasts.map((t) => t.title);
    expect(titles.some((t) => t.includes('Zone A'))).toBe(true);
    expect(titles.some((t) => t.includes('Zone B'))).toBe(true);
  });

  it('sets duration to 8000ms (double default) for alerts', () => {
    renderHook(() => useGeoFenceToasts());

    act(() => {
      useGeoFenceStore.getState().pushAlert(makeAlert());
    });

    expect(useToastStore.getState().toasts[0].duration).toBe(8000);
  });
});

// Supress unused var lint warning for the renderHook result above.
void vi;
