import { useEffect, useMemo, useRef } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useAlertStore } from '@/lib/stores/alertStore';
import type { AircraftState } from '@/lib/types';

export const EMERGENCY_SQUAWKS = new Set(['7500', '7600', '7700']);

export function squawkLabel(squawk: string): string {
  if (squawk === '7700') return 'EMERGENCY';
  if (squawk === '7600') return 'RADIO FAIL';
  if (squawk === '7500') return 'HIJACK';
  return squawk;
}

export function squawkColor(squawk: string): string {
  if (squawk === '7700') return '#F87171'; // red
  if (squawk === '7600') return '#FBBF24'; // yellow
  if (squawk === '7500') return '#FF6B35'; // orange
  return '#7A9ABF';
}

/**
 * Returns every aircraft currently on an emergency squawk — and, as a side
 * effect, records a one-time {@link FlightAlert} in {@link useAlertStore} the
 * first time we see each unique `icao24 + squawk` combination. Restoring the
 * same squawk after a gap triggers a fresh alert.
 */
export function useSquawkAlerts(): AircraftState[] {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const addAlert = useAlertStore((s) => s.addAlert);
  const seenRef = useRef<Set<string>>(new Set());

  const alerts = useMemo(() => {
    const out: AircraftState[] = [];
    aircraftMap.forEach((ac) => {
      if (ac.squawk && EMERGENCY_SQUAWKS.has(ac.squawk)) out.push(ac);
    });
    return out;
  }, [aircraftMap]);

  useEffect(() => {
    const seen = seenRef.current;
    const currentKeys = new Set<string>();
    for (const ac of alerts) {
      const key = `${ac.icao24}:${ac.squawk}`;
      currentKeys.add(key);
      if (!seen.has(key)) {
        addAlert({
          callsign: ac.callsign ?? ac.icao24,
          type: 'squawk',
          message: `${squawkLabel(ac.squawk!)} — ${ac.callsign ?? ac.icao24}`,
        });
      }
    }
    // Drop keys that are no longer present so a recurring squawk triggers again.
    for (const key of seen) if (!currentKeys.has(key)) seen.delete(key);
    currentKeys.forEach((k) => seen.add(k));
  }, [alerts, addAlert]);

  return alerts;
}
