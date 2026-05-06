import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

/**
 * Global test setup.
 *
 * Adds jest-dom matchers so `expect(el).toBeInTheDocument()` etc. work
 * in Vitest. Node-env tests ignore this (happy-dom-specific matchers
 * simply aren't called there).
 *
 * <h3>localStorage / sessionStorage polyfill (happy-dom v20+)</h3>
 * happy-dom 20 exposes a `localStorage` global but the API surface is
 * incomplete in some test contexts (`localStorage.setItem` is not a
 * function). The breadcrumb + frontend-error code reads/writes
 * localStorage on every operation; rather than mock it in every test,
 * we install a Map-backed polyfill here when the real one isn't usable.
 *
 * Production browsers don't see this — it's a test-env shim only.
 */
function shimStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key(i: number) { return Array.from(store.keys())[i] ?? null; },
    getItem(k: string) { return store.get(k) ?? null; },
    setItem(k: string, v: string) { store.set(k, String(v)); },
    removeItem(k: string) { store.delete(k); },
    clear() { store.clear(); },
  };
}

function ensureStorageOn(target: typeof globalThis): void {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    const existing = (target as unknown as Record<string, unknown>)[key];
    const usable = existing
      && typeof (existing as Storage).setItem === 'function'
      && typeof (existing as Storage).getItem === 'function';
    if (!usable) {
      Object.defineProperty(target, key, {
        configurable: true,
        writable: true,
        value: shimStorage(),
      });
    }
  }
}

ensureStorageOn(globalThis);
if (typeof window !== 'undefined') {
  ensureStorageOn(window as unknown as typeof globalThis);
}

// Reset storage between tests so per-test localStorage state doesn't leak.
beforeEach(() => {
  if (typeof globalThis.localStorage !== 'undefined' && typeof globalThis.localStorage.clear === 'function') {
    globalThis.localStorage.clear();
  }
  if (typeof globalThis.sessionStorage !== 'undefined' && typeof globalThis.sessionStorage.clear === 'function') {
    globalThis.sessionStorage.clear();
  }
});
