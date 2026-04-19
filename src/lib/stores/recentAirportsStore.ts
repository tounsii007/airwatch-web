import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentAirport {
  iata: string;
  visitedAt: number; // timestamp
}

interface RecentAirportsState {
  airports: RecentAirport[];
  addVisit: (iata: string) => void;
}

const MAX_RECENT = 12;

export const useRecentAirportsStore = create<RecentAirportsState>()(
  persist(
    (set, get) => ({
      airports: [],

      addVisit: (iata: string) => {
        const now = Date.now();
        const existing = get().airports.filter((a) => a.iata !== iata);
        set({ airports: [{ iata, visitedAt: now }, ...existing].slice(0, MAX_RECENT) });
      },
    }),
    { name: 'airwatch-recent-airports' }
  )
);
