import { create } from 'zustand';
import type { AircraftState, AltitudeFilter, CategoryFilter } from '@/lib/types';
import { buildAircraftMap } from '@/lib/flights/airlabs';
import { mergeAircraftMaps } from '@/lib/flights/aircraftFreshness';
import { fetchAirlabsFlights } from '@/lib/flights/api';
import { isMockAircraft } from '@/lib/flights/mockEmergencies';
import { resolvePollingIntervalMs } from '@/lib/flights/polling';
import { startLiveFeed, type FeedTransport } from '@/lib/flights/liveFeed';
import { useSettingsStore } from '@/lib/stores/settingsStore';

interface FlightStoreState {
  aircraftMap: Map<string, AircraftState>;
  selectedAircraft: AircraftState | null;
  altitudeFilter: AltitudeFilter;
  categoryFilter: CategoryFilter;
  isLoading: boolean;
  lastFetchTime: number | null;
  error: string | null;
  /** 'websocket' while the backend is pushing us frames, 'polling' when falling back. */
  transport: FeedTransport | null;
  _feedHandle: { stop: () => void } | null;
}

interface FlightStoreActions {
  fetchFlights: () => Promise<void>;
  selectAircraft: (aircraft: AircraftState) => void;
  clearSelection: () => void;
  setAltitudeFilter: (filter: AltitudeFilter) => void;
  setCategoryFilter: (filter: CategoryFilter) => void;
  /** Start the live feed (WebSocket preferred, polling fallback). */
  startPolling: () => void;
  stopPolling: () => void;
  /** Dev-only: inject mock aircraft (e.g. emergency squawks) into the map. */
  injectMockAircraft: (aircraft: AircraftState[]) => void;
  /** Dev-only: drop every mock aircraft previously injected. */
  clearMockAircraft: () => void;
  /** Dev-only: drop mock aircraft whose icao24 starts with `prefix`. */
  clearMockByPrefix: (prefix: string) => void;
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
  transport: null,
  _feedHandle: null,

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

      const freshMap = buildAircraftMap(result.flights);
      const { aircraftMap: prevMap, selectedAircraft } = get();
      const mergedMap = mergeAircraftMaps(prevMap, freshMap, Date.now());
      const updatedSelected = selectedAircraft ? mergedMap.get(selectedAircraft.icao24) ?? null : null;

      set({
        aircraftMap: mergedMap,
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
    const { _feedHandle } = get();
    if (_feedHandle) return; // Already feeding

    const intervalMs = resolvePollingIntervalMs(useSettingsStore.getState().updateInterval);
    const backendUrl = process.env.NEXT_PUBLIC_PROXY_URL ?? undefined;

    set({ isLoading: true, error: null });

    const handle = startLiveFeed(
      { pollingIntervalMs: intervalMs, backendUrl, fetchPoll: fetchAirlabsFlights },
      {
        onFlights: (flights, transport) => {
          if (flights.length === 0) {
            set({ isLoading: false, lastFetchTime: Date.now(), transport, error: null });
            return;
          }
          const freshMap = buildAircraftMap(flights);
          const { aircraftMap: prevMap, selectedAircraft } = get();
          const mergedMap = mergeAircraftMaps(prevMap, freshMap, Date.now());
          const updatedSelected = selectedAircraft
            ? mergedMap.get(selectedAircraft.icao24) ?? null
            : null;
          set({
            aircraftMap: mergedMap,
            selectedAircraft: updatedSelected,
            isLoading: false,
            lastFetchTime: Date.now(),
            transport,
            error: null,
          });
        },
        onError: (error) => set({ error, isLoading: false }),
        onTransportChange: (transport) => set({ transport }),
      },
    );

    set({ _feedHandle: handle });
  },

  stopPolling: () => {
    const { _feedHandle } = get();
    if (_feedHandle) {
      _feedHandle.stop();
      set({ _feedHandle: null, transport: null });
    }
  },

  injectMockAircraft: (aircraft: AircraftState[]) => {
    if (aircraft.length === 0) return;
    const { aircraftMap } = get();
    const next = new Map(aircraftMap);
    aircraft.forEach((ac) => next.set(ac.icao24, ac));
    set({ aircraftMap: next });
  },

  clearMockAircraft: () => {
    const { aircraftMap, selectedAircraft } = get();
    const next = new Map<string, AircraftState>();
    aircraftMap.forEach((ac, id) => { if (!isMockAircraft(ac)) next.set(id, ac); });
    const clearedSelection = selectedAircraft && isMockAircraft(selectedAircraft) ? null : selectedAircraft;
    set({ aircraftMap: next, selectedAircraft: clearedSelection });
  },

  clearMockByPrefix: (prefix: string) => {
    const { aircraftMap, selectedAircraft } = get();
    const next = new Map<string, AircraftState>();
    aircraftMap.forEach((ac, id) => { if (!ac.icao24.startsWith(prefix)) next.set(id, ac); });
    const clearedSelection =
      selectedAircraft && selectedAircraft.icao24.startsWith(prefix) ? null : selectedAircraft;
    set({ aircraftMap: next, selectedAircraft: clearedSelection });
  },
}));
