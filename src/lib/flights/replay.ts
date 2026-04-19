import { apiFetch } from '@/lib/apiFetch';
import {
  FlightPositionSchema,
  ReplayInfoSchema,
  safeParseArray,
  type FlightPosition,
  type ReplayInfo,
} from '@/lib/schemas';

export type { FlightPosition, ReplayInfo } from '@/lib/schemas';

const BASE = '/api/proxy/api';

export async function fetchHistory(icao24: string, hours = 24): Promise<FlightPosition[]> {
  const res = await apiFetch(`${BASE}/flights/${encodeURIComponent(icao24)}/history?hours=${hours}`);
  if (!res.ok) return [];
  const raw = await res.json().catch(() => null);
  return safeParseArray(FlightPositionSchema, raw, 'flight-history').items;
}

export async function fetchAvailableReplays(): Promise<ReplayInfo[]> {
  const res = await apiFetch(`${BASE}/replay/available`);
  if (!res.ok) return [];
  const raw = await res.json().catch(() => null);
  return safeParseArray(ReplayInfoSchema, raw, 'available-replays').items;
}
