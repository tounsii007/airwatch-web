import { create } from 'zustand';
import type { AircraftState, AltitudeFilter, CategoryFilter } from '@/lib/types';
import { buildAircraftMap } from '@/lib/flights/airlabs';
import { fetchAirlabsFlights } from '@/lib/flights/api';
import { resolvePollingIntervalMs } from '@/lib/flights/polling';
import { useSettingsStore } from '@/lib/stores/settingsStore';

interface FlightStoreState {
  aircraftMap: Map<string, AircraftState>;
  selectedAircraft: AircraftState | null;
  altitudeFilter: AltitudeFilter;
  categoryFilter: CategoryFilter;
  isLoading: boolean;
  lastFetchTime: number | null;
  error: string | null;
  _pollTimer: ReturnType<typeof setInterval> | null;
}

interface FlightStoreActions {
  fetchFlights: () => Promise<void>;
  selectAircraft: (aircraft: AircraftState) => void;
  clearSelection: () => void;
  setAltitudeFilter: (filter: AltitudeFilter) => void;
  setCategoryFilter: (filter: CategoryFilter) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

type FlightStore = FlightStoreState & FlightStoreActions;

export const useFlightStore = create<FlightStore>((set, get) => ({
  aircraftMap: new Map(),
  selectedAircraft: null,
  altitudeFilter: 'all',
  categoryFilter: 'all',
  isLoading: false,
  lastFetchTime: null,
  error: null,
  _pollTimer: null,

  fetchFlights: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await fetchAirlabsFlights();
      if (result.error) {
        set({ error: result.error, isLoading: false });
        return;
      }

      if (result.flights.length === 0) {
        set({ isLoading: false, lastFetchTime: Date.now() });
        return;
      }

      const newMap = buildAircraftMap(result.flights);
      const { selectedAircraft } = get();
      const updatedSelected = selectedAircraft ? newMap.get(selectedAircraft.icao24) ?? null : null;

      set({
        aircraftMap: newMap,
        selectedAircraft: updatedSelected,
        isLoading: false,
        lastFetchTime: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching flights';
      set({ error: message, isLoading: false });
    }
  },

  selectAircraft: (aircraft: AircraftState) => {
    set({ selectedAircraft: aircraft });
  },

  clearSelection: () => {
    set({ selectedAircraft: null });
  },

  setAltitudeFilter: (filter: AltitudeFilter) => {
    set({ altitudeFilter: filter });
  },

  setCategoryFilter: (filter: CategoryFilter) => {
    set({ categoryFilter: filter });
  },

  startPolling: () => {
    const { _pollTimer, fetchFlights } = get();
    if (_pollTimer) return; // Already polling

    // Fetch immediately
    fetchFlights();

    // Then poll at the configured interval
    const intervalMs = resolvePollingIntervalMs(useSettingsStore.getState().updateInterval);
    const timer = setInterval(() => {
      get().fetchFlights();
    }, intervalMs);

    set({ _pollTimer: timer });
  },

  stopPolling: () => {
    const { _pollTimer } = get();
    if (_pollTimer) {
      clearInterval(_pollTimer);
      set({ _pollTimer: null });
    }
  },
}));
