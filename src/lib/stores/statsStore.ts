import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AircraftState } from '@/lib/types';

const MAX_ENTRIES = 500;

export interface FlightStatEntry {
  icao24: string;
  callsign?: string;
  airlineIcao?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  viewCount: number;
  depIata?: string;
  arrIata?: string;
}

interface StatsStoreState {
  viewedFlights: FlightStatEntry[];
  totalViews: number;
}

interface StatsStoreActions {
  recordView: (aircraft: AircraftState) => void;
  clearStats: () => void;
}

type StatsStore = StatsStoreState & StatsStoreActions;

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      viewedFlights: [],
      totalViews: 0,

      recordView: (aircraft: AircraftState) => {
        const { viewedFlights, totalViews } = get();
        const now = Date.now();
        const existing = viewedFlights.find((e) => e.icao24 === aircraft.icao24);

        let updated: FlightStatEntry[];
        if (existing) {
          updated = viewedFlights.map((e) =>
            e.icao24 === aircraft.icao24
              ? { ...e, viewCount: e.viewCount + 1, lastSeenAt: now,
                  callsign: aircraft.callsign ?? e.callsign,
                  depIata: aircraft.depIata ?? e.depIata,
                  arrIata: aircraft.arrIata ?? e.arrIata,
                  airlineIcao: aircraft.airlineIcao ?? e.airlineIcao }
              : e
          );
        } else {
          const entry: FlightStatEntry = {
            icao24: aircraft.icao24,
            callsign: aircraft.callsign,
            airlineIcao: aircraft.airlineIcao,
            firstSeenAt: now,
            lastSeenAt: now,
            viewCount: 1,
            depIata: aircraft.depIata,
            arrIata: aircraft.arrIata,
          };
          // Cap at MAX_ENTRIES — evict oldest
          const base = viewedFlights.length >= MAX_ENTRIES
            ? viewedFlights.slice(-(MAX_ENTRIES - 1))
            : viewedFlights;
          updated = [...base, entry];
        }

        set({ viewedFlights: updated, totalViews: totalViews + 1 });
      },

      clearStats: () => set({ viewedFlights: [], totalViews: 0 }),
    }),
    { name: 'airwatch-stats' }
  )
);
