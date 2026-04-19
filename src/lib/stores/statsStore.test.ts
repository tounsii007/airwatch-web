import { beforeEach, describe, expect, it } from 'vitest';
import { useStatsStore } from '@/lib/stores/statsStore';
import type { AircraftState } from '@/lib/types';

const makeAircraft = (icao24: string, overrides: Partial<AircraftState> = {}): AircraftState => ({
  icao24,
  onGround: false,
  category: 0,
  lastUpdate: Date.now(),
  ...overrides,
});

describe('useStatsStore', () => {
  beforeEach(() => {
    useStatsStore.setState({ viewedFlights: [], totalViews: 0 });
  });

  it('records a new view', () => {
    useStatsStore.getState().recordView(makeAircraft('abc', { callsign: 'LH400' }));
    const state = useStatsStore.getState();
    expect(state.viewedFlights).toHaveLength(1);
    expect(state.totalViews).toBe(1);
    expect(state.viewedFlights[0].viewCount).toBe(1);
  });

  it('increments viewCount for repeat views', () => {
    const { recordView } = useStatsStore.getState();
    recordView(makeAircraft('abc'));
    recordView(makeAircraft('abc'));
    recordView(makeAircraft('abc'));
    const state = useStatsStore.getState();
    expect(state.viewedFlights).toHaveLength(1);
    expect(state.viewedFlights[0].viewCount).toBe(3);
    expect(state.totalViews).toBe(3);
  });

  it('merges new metadata on repeat views', () => {
    const { recordView } = useStatsStore.getState();
    recordView(makeAircraft('abc'));
    recordView(makeAircraft('abc', { callsign: 'LH400', depIata: 'FRA' }));
    const entry = useStatsStore.getState().viewedFlights[0];
    expect(entry.callsign).toBe('LH400');
    expect(entry.depIata).toBe('FRA');
  });

  it('clearStats resets everything', () => {
    const { recordView, clearStats } = useStatsStore.getState();
    recordView(makeAircraft('abc'));
    clearStats();
    expect(useStatsStore.getState().viewedFlights).toHaveLength(0);
    expect(useStatsStore.getState().totalViews).toBe(0);
  });
});
