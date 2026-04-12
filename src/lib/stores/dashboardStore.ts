import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_AIRPORTS } from '@/app/dashboard/dashboardData';

interface DashboardStoreState {
  airportCodes: string[];
  addAirportCode: (iata: string) => void;
  removeAirportCode: (iata: string) => void;
  resetAirportCodes: () => void;
}

export const useDashboardStore = create<DashboardStoreState>()(
  persist(
    (set, get) => ({
      airportCodes: DEFAULT_AIRPORTS,
      addAirportCode: (iata: string) => {
        const normalized = iata.trim().toUpperCase();
        if (!normalized || get().airportCodes.includes(normalized)) return;
        set((state) => ({ airportCodes: [...state.airportCodes, normalized] }));
      },
      removeAirportCode: (iata: string) => {
        set((state) => ({ airportCodes: state.airportCodes.filter((code) => code !== iata.toUpperCase()) }));
      },
      resetAirportCodes: () => set({ airportCodes: DEFAULT_AIRPORTS }),
    }),
    { name: 'airwatch-dashboard' }
  )
);
