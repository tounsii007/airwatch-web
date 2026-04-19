import { beforeEach, describe, expect, it } from 'vitest';
import { useGeoFenceStore, type GeoFenceAlert } from '@/lib/stores/geofenceStore';

const makeAlert = (overrides: Partial<GeoFenceAlert> = {}): GeoFenceAlert => ({
  fenceId: 1,
  fenceName: 'Test Zone',
  icao24: 'abc123',
  latitude: 50,
  longitude: 8,
  altitude: 10000,
  speed: 850,
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('useGeoFenceStore', () => {
  beforeEach(() => {
    useGeoFenceStore.setState({ alerts: [] });
  });

  it('pushes an alert', () => {
    useGeoFenceStore.getState().pushAlert(makeAlert());
    expect(useGeoFenceStore.getState().alerts).toHaveLength(1);
  });

  it('dedupes same (icao24, fenceId) — keeps newest', () => {
    const { pushAlert } = useGeoFenceStore.getState();
    pushAlert(makeAlert({ callsign: 'OLD' }));
    pushAlert(makeAlert({ callsign: 'NEW' }));
    const alerts = useGeoFenceStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].callsign).toBe('NEW');
  });

  it('keeps separate entries for different fences', () => {
    const { pushAlert } = useGeoFenceStore.getState();
    pushAlert(makeAlert({ fenceId: 1 }));
    pushAlert(makeAlert({ fenceId: 2 }));
    expect(useGeoFenceStore.getState().alerts).toHaveLength(2);
  });

  it('dismiss removes specific alert', () => {
    const { pushAlert, dismissAlert } = useGeoFenceStore.getState();
    pushAlert(makeAlert({ icao24: 'a' }));
    pushAlert(makeAlert({ icao24: 'b' }));
    dismissAlert('a', 1);
    const alerts = useGeoFenceStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].icao24).toBe('b');
  });

  it('truncates to maxAlerts', () => {
    useGeoFenceStore.setState({ alerts: [], maxAlerts: 3 });
    const { pushAlert } = useGeoFenceStore.getState();
    for (let i = 0; i < 5; i++) {
      pushAlert(makeAlert({ icao24: `a${i}` }));
    }
    expect(useGeoFenceStore.getState().alerts).toHaveLength(3);
    // Newest comes first
    expect(useGeoFenceStore.getState().alerts[0].icao24).toBe('a4');
  });
});
