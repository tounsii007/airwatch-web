'use client';

import { useCallback, useEffect, useState } from 'react';
import { createFence, deleteFence, getOrCreateClientId, listFences, type GeoFence } from '@/lib/flights/geofence';
import { useMounted } from '@/lib/hooks/useMounted';

/** Fetch + create + delete for client-owned geofences. */
export function useFences() {
  const mounted = useMounted();
  const [fences, setFences] = useState<GeoFence[]>([]);

  const refresh = useCallback(async () => {
    if (!mounted) return;
    setFences(await listFences(getOrCreateClientId()));
  }, [mounted]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const create = useCallback(async (payload: GeoFence): Promise<boolean> => {
    const created = await createFence(payload);
    if (created) void refresh();
    return Boolean(created);
  }, [refresh]);

  const remove = useCallback(async (id?: number) => {
    if (!id) return;
    await deleteFence(id);
    void refresh();
  }, [refresh]);

  return { fences, create, remove };
}
