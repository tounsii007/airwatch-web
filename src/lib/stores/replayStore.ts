import { create } from 'zustand';

export interface ReplayPosition {
  lat: number;
  lon: number;
  alt: number; // meters
  speed: number; // m/s
  heading: number;
  ts: number; // timestamp ms
}

interface ReplayStoreState {
  positions: ReplayPosition[];
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: 1 | 5 | 10;
  callsign: string | null;
}

interface ReplayStoreActions {
  setPositions: (callsign: string, positions: ReplayPosition[]) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: 1 | 5 | 10) => void;
  setIndex: (index: number) => void;
  tick: () => void;
  reset: () => void;
}

type ReplayStore = ReplayStoreState & ReplayStoreActions;

export const useReplayStore = create<ReplayStore>((set, get) => ({
  positions: [],
  currentIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  callsign: null,

  setPositions: (callsign, positions) => set({ callsign, positions, currentIndex: 0, isPlaying: false }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ playbackSpeed: speed }),
  setIndex: (index) => set({ currentIndex: Math.max(0, Math.min(index, get().positions.length - 1)) }),
  tick: () => {
    const { currentIndex, positions, playbackSpeed } = get();
    const next = currentIndex + playbackSpeed;
    if (next >= positions.length) {
      set({ isPlaying: false, currentIndex: positions.length - 1 });
    } else {
      set({ currentIndex: next });
    }
  },
  reset: () => set({ positions: [], currentIndex: 0, isPlaying: false, callsign: null }),
}));
