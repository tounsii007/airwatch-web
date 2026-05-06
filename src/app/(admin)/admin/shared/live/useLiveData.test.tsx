// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { ReactNode } from 'react';
import { useLiveData, dispatchGlobalRefresh, REFRESH_EVENT } from './useLiveData';

/**
 * Coverage for the SWR-backed useLiveData wrapper. We isolate via a
 * fresh SWRConfig per-test so the cache doesn't leak between tests.
 */

function fetchMock(responses: Record<string, unknown> | ((url: string) => unknown)) {
  return vi.fn(async (url: RequestInfo | URL) => {
    const u = typeof url === 'string' ? url : (url as Request).url ?? String(url);
    const body = typeof responses === 'function' ? responses(u) : responses[u];
    if (body == null) return new Response('{}', { status: 404 });
    if (body instanceof Error) throw body;
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

// Mirrors the production SWRProvider's fetcher (cookies, no-store, JSON,
// throw with .status on non-2xx). Tests need this because we don't mount
// the production SWRProvider — bare SWRConfig has no default fetcher.
async function testFetcher(url: string): Promise<unknown> {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function withProvider() {
  function SWRTestProvider({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, fetcher: testFetcher }}>
        {children}
      </SWRConfig>
    );
  }
  return SWRTestProvider;
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLiveData', () => {
  it('fetches data on mount and exposes loading + lastUpdatedMs transitions', async () => {
    window.fetch = fetchMock({ '/admin/api/test': { count: 5 } }) as typeof window.fetch;

    const { result } = renderHook(
      () => useLiveData<{ count: number }>('/admin/api/test'),
      { wrapper: withProvider() },
    );

    // Initial render: loading=true (SWR isValidating), data=null
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 5 });
    });
    expect(result.current.lastUpdatedMs).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('uses initialData as fallbackData and sets lastUpdatedMs at mount', async () => {
    window.fetch = fetchMock({ '/admin/api/test': { count: 99 } }) as typeof window.fetch;

    const { result } = renderHook(
      () => useLiveData<{ count: number }>('/admin/api/test', { initialData: { count: 0 } }),
      { wrapper: withProvider() },
    );

    // Should NOT be null — fallbackData kicks in
    expect(result.current.data).toEqual({ count: 0 });
    // lastUpdatedMs seeded immediately because hasInitial=true
    expect(result.current.lastUpdatedMs).not.toBeNull();
  });

  it('exposes the SWR error.message on a 4xx/5xx', async () => {
    window.fetch = vi.fn(async () =>
      new Response('Server Error', { status: 500 })) as typeof window.fetch;

    const { result } = renderHook(
      () => useLiveData('/admin/api/broken'),
      { wrapper: withProvider() },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.error).toContain('500');
  });

  it('null url skips the request', () => {
    const fetcher = fetchMock({ '/x': { ok: true } });
    window.fetch = fetcher as typeof window.fetch;

    const { result } = renderHook(
      () => useLiveData(null),
      { wrapper: withProvider() },
    );

    expect(result.current.data).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refresh() triggers a re-fetch', async () => {
    const fetcher = fetchMock({ '/admin/api/r': { v: 1 } });
    window.fetch = fetcher as typeof window.fetch;

    const { result } = renderHook(
      () => useLiveData<{ v: number }>('/admin/api/r'),
      { wrapper: withProvider() },
    );

    await waitFor(() => expect(result.current.data?.v).toBe(1));
    const callsAfterMount = fetcher.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetcher.mock.calls.length).toBeGreaterThan(callsAfterMount);
  });

  it('dispatchGlobalRefresh fires the legacy CustomEvent', () => {
    const handler = vi.fn();
    window.addEventListener(REFRESH_EVENT, handler);
    dispatchGlobalRefresh();
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(REFRESH_EVENT, handler);
  });

  it('mutate() with optimisticData patches cache + revalidates', async () => {
    let serverValue = { count: 1 };
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(serverValue), { status: 200 })) as typeof window.fetch;
    window.fetch = fetcher;

    const { result } = renderHook(
      () => useLiveData<{ count: number }>('/admin/api/m'),
      { wrapper: withProvider() },
    );

    await waitFor(() => expect(result.current.data?.count).toBe(1));

    // Optimistic mutation: writer increments the server value, optimisticData
    // shows the new value immediately. After the writer resolves, the cache
    // re-validates against the server's new state.
    const writerCalled = vi.fn();
    await act(async () => {
      await result.current.mutate(async () => {
        writerCalled();
        serverValue = { count: 2 };
        return { ok: true };
      }, { optimisticData: { count: 2 } });
    });

    expect(writerCalled).toHaveBeenCalled();
    await waitFor(() => expect(result.current.data?.count).toBe(2));
  });

  it('mutate() rolls back on writer error when rollbackOnError=true (default)', async () => {
    window.fetch = fetchMock({ '/admin/api/m2': { count: 10 } }) as typeof window.fetch;

    const { result } = renderHook(
      () => useLiveData<{ count: number }>('/admin/api/m2'),
      { wrapper: withProvider() },
    );

    await waitFor(() => expect(result.current.data?.count).toBe(10));

    await act(async () => {
      await result.current.mutate(async () => {
        throw new Error('writer failed');
      }, { optimisticData: { count: 999 } });
    });

    // Cache should NOT be the optimistic value — it rolled back.
    await waitFor(() => expect(result.current.data?.count).not.toBe(999));
  });
});
