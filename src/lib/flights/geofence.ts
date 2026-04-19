/**
 * GeoFence REST client — validates every response against a Zod schema so
 * backend drift surfaces at the fetch boundary instead of deep in the UI.
 */

import { apiFetch } from '@/lib/apiFetch';
import { GeoFenceSchema, safeParse, safeParseArray, type GeoFence } from '@/lib/schemas';

export type { GeoFence } from '@/lib/schemas';

const BASE = '/api/proxy/api/geofence';

export async function listFences(clientId: string): Promise<GeoFence[]> {
  const res = await apiFetch(`${BASE}?clientId=${encodeURIComponent(clientId)}`);
  if (!res.ok) return [];
  const raw = await res.json().catch(() => null);
  return safeParseArray(GeoFenceSchema, raw, 'listFences').items;
}

export async function createFence(fence: GeoFence): Promise<GeoFence | null> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fence),
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null);
  return safeParse(GeoFenceSchema, raw, 'createFence');
}

export async function deleteFence(id: number): Promise<boolean> {
  const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
  return res.ok;
}

/**
 * Stable per-browser client id for scoping fences. Generated once, persisted
 * in localStorage. Not a security boundary — purely a scoping key.
 */
export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'server';
  const KEY = 'airwatch-client-id';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
