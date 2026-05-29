/**
 * GeoFence REST client — validates every response against a Zod schema so
 * backend drift surfaces at the fetch boundary instead of deep in the UI.
 *
 * SECURITY: `clientId` ist faktisch ein Bearer-Token. Wer ihn hat, kann
 * fremde Geofences lesen, anlegen, löschen. Daher:
 *   - NICHT in Query-Strings (landen in Server-Logs + Referer-Headern)
 *   - NICHT loggen
 *   - Nur über `X-Client-Id` Header oder POST-Body übertragen
 *   - In localStorage als 122-Bit-UUID gespeichert (siehe getOrCreateClientId)
 */

import { apiFetch } from '@/lib/apiFetch';
import { GeoFenceSchema, safeParse, safeParseArray, type GeoFence } from '@/lib/schemas';

export type { GeoFence } from '@/lib/schemas';

const BASE = '/api/proxy/api/geofence';

function clientIdHeader(clientId: string): Record<string, string> {
  return { 'X-Client-Id': clientId };
}

export async function listFences(clientId: string): Promise<GeoFence[]> {
  const res = await apiFetch(BASE, { headers: clientIdHeader(clientId) });
  if (!res.ok) return [];
  const raw = await res.json().catch(() => null);
  return safeParseArray(GeoFenceSchema, raw, 'listFences').items;
}

export async function createFence(fence: GeoFence): Promise<GeoFence | null> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...clientIdHeader(fence.clientId) },
    body: JSON.stringify(fence),
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null);
  return safeParse(GeoFenceSchema, raw, 'createFence');
}

export async function deleteFence(id: number, clientId: string): Promise<boolean> {
  const res = await apiFetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: clientIdHeader(clientId),
  });
  return res.ok;
}

/**
 * Stable per-browser client id for scoping fences. Generated once, persisted
 * in localStorage. **Behandle wie ein Bearer-Token** — siehe Datei-Header.
 */
export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'server';
  const KEY = 'airwatch-client-id';
  let id = window.localStorage.getItem(KEY);
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
