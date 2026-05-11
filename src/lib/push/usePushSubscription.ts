'use client';

/**
 * Web Push subscription hook.
 *
 * <h3>Wire-up</h3>
 *   1. Service worker (`/sw.js`) listens for `push` events and renders
 *      an OS notification. See public/sw.js.
 *   2. This hook handles the page side: query permission, subscribe
 *      via PushManager, post the subscription to the api (which
 *      persists it for outbound delivery), and offer an unsubscribe.
 *   3. The api (TODO P1-1.api: a /api/proxy/push/subscribe endpoint)
 *      stores the subscription tied to clientId. When AlertRecorder
 *      fires a matching alert it POSTs to subscription.endpoint with
 *      a JSON body; the browser wakes the SW.
 *
 * <h3>Three permission states the UI cares about</h3>
 *   * `'unsupported'` — no PushManager at all (Safari < 16, headless,
 *     etc). Hide the toggle.
 *   * `'denied'` — user explicitly said no. Show a hint to flip via
 *     site settings; clicking the toggle won't re-prompt.
 *   * `'default' | 'granted'` — proceed with subscribe / unsubscribe.
 *
 * <h3>VAPID key</h3>
 * Public key is exposed via NEXT_PUBLIC_VAPID_PUBLIC_KEY (the api
 * keeps the matching private key in its env). Both must be base64-url.
 * If the env var isn't set we treat the feature as unavailable so a
 * dev environment without VAPID config doesn't trip a runtime error.
 */
import { useCallback, useEffect, useState } from 'react';

export type PushStatus =
  | 'unsupported'
  | 'unconfigured'
  | 'denied'
  | 'default'
  | 'granted';

export interface PushSubscriptionState {
  status: PushStatus;
  /** True while a subscribe / unsubscribe call is in flight. */
  busy: boolean;
  /** Last error from the browser API or our /subscribe POST, if any. */
  error: string | null;
  /** True when there's an active subscription tied to this clientId. */
  subscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/** SW-friendly base64-url → Uint8Array — the format pushManager wants. */
export function _urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/**
 * @param clientId — caller-provided stable id. Used as the dedup key
 *                   on the api side so a user with multiple tabs gets
 *                   one subscription, not N.
 */
export function usePushSubscription(clientId: string | null): PushSubscriptionState {
  const [status, setStatus] = useState<PushStatus>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial probe — what's the browser allow / what does the SW say?
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus('unconfigured');
      return;
    }
    setStatus(Notification.permission as PushStatus);

    // If a subscription already exists from a previous visit, surface
    // it so the toggle reads correctly on first paint.
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => { /* ignore — initial probe is best-effort */ });
  }, []);

  const subscribe = useCallback(async () => {
    if (!clientId) {
      setError('clientId missing — cannot subscribe');
      return;
    }
    if (status === 'unsupported' || status === 'unconfigured' || status === 'denied') {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Permission prompt. Returns 'granted' | 'denied' | 'default'.
      const perm = await Notification.requestPermission();
      setStatus(perm as PushStatus);
      if (perm !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      // Re-use an existing sub if there is one — pushManager.subscribe
      // throws if a sub already exists on a different VAPID key.
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const res = await fetch('/api/proxy/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId, subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error(`api ${res.status}`);
      setSubscribed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [clientId, status]);

  const unsubscribe = useCallback(async () => {
    if (!clientId) return;
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Best-effort delete on the api — if it fails we still treat
        // the local sub as gone, which is what the user expects.
        await fetch('/api/proxy/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ clientId, endpoint: sub.endpoint }),
        }).catch(() => { /* swallow */ });
      }
      setSubscribed(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [clientId]);

  return { status, busy, error, subscribed, subscribe, unsubscribe };
}
