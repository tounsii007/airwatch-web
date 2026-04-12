import { useMemo } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
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

export function useSquawkAlerts(): AircraftState[] {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  return useMemo(() => {
    const alerts: AircraftState[] = [];
    aircraftMap.forEach((ac) => {
      if (ac.squawk && EMERGENCY_SQUAWKS.has(ac.squawk)) {
        alerts.push(ac);
      }
    });
    return alerts;
  }, [aircraftMap]);
}
