import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AlertType = 'landing' | 'takeoff' | 'delay' | 'squawk';

export interface WatchedFlight {
  icao24: string;
  callsign: string;
  alertTypes: AlertType[];
  lastStatus?: string;
  addedAt: number;
}

export interface FlightAlert {
  id: string;
  callsign: string;
  type: AlertType;
  message: string;
  timestamp: number;
  read: boolean;
}

interface AlertStoreState {
  watchedFlights: WatchedFlight[];
  alerts: FlightAlert[];
  notificationsGranted: boolean;
}

interface AlertStoreActions {
  watchFlight: (icao24: string, callsign: string, types: AlertType[]) => void;
  unwatchFlight: (icao24: string) => void;
  isWatching: (icao24: string) => boolean;
  addAlert: (alert: Omit<FlightAlert, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  clearAlerts: () => void;
  setNotificationsGranted: (granted: boolean) => void;
  updateLastStatus: (icao24: string, status: string) => void;
}

type AlertStore = AlertStoreState & AlertStoreActions;

export const useAlertStore = create<AlertStore>()(
  persist(
    (set, get) => ({
      watchedFlights: [],
      alerts: [],
      notificationsGranted: false,

      watchFlight: (icao24, callsign, types) => {
        const { watchedFlights } = get();
        if (watchedFlights.some((w) => w.icao24 === icao24)) return;
        set({ watchedFlights: [...watchedFlights, { icao24, callsign, alertTypes: types, addedAt: Date.now() }] });
      },

      unwatchFlight: (icao24) => {
        set({ watchedFlights: get().watchedFlights.filter((w) => w.icao24 !== icao24) });
      },

      isWatching: (icao24) => get().watchedFlights.some((w) => w.icao24 === icao24),

      addAlert: (alert) => {
        const newAlert: FlightAlert = {
          ...alert,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
          read: false,
        };
        set({ alerts: [newAlert, ...get().alerts].slice(0, 50) }); // cap at 50

        // Send browser notification
        if (get().notificationsGranted && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(`AirWatch — ${alert.callsign}`, {
              body: alert.message,
              icon: '/icons/icon-192.svg',
              tag: newAlert.id,
            });
          } catch { /* ignore */ }
        }
      },

      markRead: (id) => {
        set({ alerts: get().alerts.map((a) => a.id === id ? { ...a, read: true } : a) });
      },

      clearAlerts: () => set({ alerts: [] }),

      setNotificationsGranted: (granted) => set({ notificationsGranted: granted }),

      updateLastStatus: (icao24, status) => {
        set({
          watchedFlights: get().watchedFlights.map((w) =>
            w.icao24 === icao24 ? { ...w, lastStatus: status } : w
          ),
        });
      },
    }),
    { name: 'airwatch-alerts' }
  )
);
