import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Max geo-fence alerts retained in persisted history (oldest drop off). */
const MAX_GEOFENCE_ALERTS = 100;

export interface GeoFenceAlert {
  fenceId: number;
  fenceName: string;
  icao24: string;
  callsign?: string;
  airlineIcao?: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  timestamp: string;
}

interface GeoFenceStoreState {
  alerts: GeoFenceAlert[];
  /** Max alerts to keep in history. */
  maxAlerts: number;
}

interface GeoFenceStoreActions {
  pushAlert: (alert: GeoFenceAlert) => void;
  clearAlerts: () => void;
  dismissAlert: (icao24: string, fenceId: number) => void;
}

type GeoFenceStore = GeoFenceStoreState & GeoFenceStoreActions;

export const useGeoFenceStore = create<GeoFenceStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      maxAlerts: MAX_GEOFENCE_ALERTS,

      pushAlert: (alert: GeoFenceAlert) => {
        const { alerts, maxAlerts } = get();
        // Dedupe by (icao24, fenceId) — keep newest only.
        const filtered = alerts.filter(
          (a) => !(a.icao24 === alert.icao24 && a.fenceId === alert.fenceId),
        );
        const next = [alert, ...filtered].slice(0, maxAlerts);
        set({ alerts: next });
      },

      dismissAlert: (icao24: string, fenceId: number) => {
        set({
          alerts: get().alerts.filter(
            (a) => !(a.icao24 === icao24 && a.fenceId === fenceId),
          ),
        });
      },

      clearAlerts: () => set({ alerts: [] }),
    }),
    { name: 'airwatch-geofence-alerts' },
  ),
);
