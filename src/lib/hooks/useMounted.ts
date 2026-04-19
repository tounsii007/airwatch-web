import { useSyncExternalStore } from 'react';

/**
 * Returns `true` after the component has mounted on the client, `false`
 * during SSR and the first render. Use this to guard localStorage /
 * `window`-dependent reads that would otherwise cause hydration mismatches.
 *
 * Uses `useSyncExternalStore` so there is no `setState` inside an effect —
 * this is the pattern React 18+ recommends over the `useEffect(() => setMounted(true), [])` idiom.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    getSnapshot, // client: true
    getServerSnapshot, // server: false
  );
}

function noopSubscribe() {
  return () => {
    /* nothing to unsubscribe; mount status never changes after first commit */
  };
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}
