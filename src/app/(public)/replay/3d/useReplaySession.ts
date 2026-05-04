'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMounted } from '@/lib/hooks/useMounted';
import { fetchAvailableReplays, fetchHistory, type FlightPosition, type ReplayInfo } from '@/lib/flights/replay';

interface State {
  replays: ReplayInfo[];
  selected: ReplayInfo | null;
  positions: FlightPosition[];
  loading: boolean;
}

const INITIAL: State = { replays: [], selected: null, positions: [], loading: false };

/** Small state container so the page component stays declarative. */
export function useReplaySession() {
  const mounted = useMounted();
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    if (!mounted) return;
    let active = true;
    void fetchAvailableReplays().then((replays) => {
      if (active) setState((s) => ({ ...s, replays }));
    });
    return () => { active = false; };
  }, [mounted]);

  const select = useCallback(async (r: ReplayInfo) => {
    setState((s) => ({ ...s, selected: r, loading: true }));
    const positions = await fetchHistory(r.icao24, 24);
    setState((s) => ({ ...s, positions, loading: false }));
  }, []);

  return { ...state, select };
}
