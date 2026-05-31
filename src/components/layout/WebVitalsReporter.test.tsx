// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { WebVitalsReporter } from './WebVitalsReporter';

// Capture the reporter callback that next/web-vitals would normally
// invoke from its own measurement loop.
const captured = vi.hoisted(() => ({ cb: null as null | ((m: Record<string, unknown>) => void) }));
vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (cb: (m: Record<string, unknown>) => void) => { captured.cb = cb; },
}));

type Nav = { sendBeacon?: (url: string, data?: BodyInit) => boolean };
const sendBeacon = vi.fn();

// happy-dom binds the component's bare `fetch`/`navigator` to the window
// globals, which vi.stubGlobal doesn't reach — define them directly.
const REAL_FETCH = globalThis.fetch;
const REAL_NAV = globalThis.navigator;
function defineOnGlobals(name: string, value: unknown) {
  Object.defineProperty(window, name, { configurable: true, value });
  Object.defineProperty(globalThis, name, { configurable: true, value });
}
function installFetchMock() {
  const fn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  defineOnGlobals('fetch', fn);
  return fn;
}
/** Swap in a beacon-less navigator so the reporter takes the fetch path. */
function dropSendBeacon() {
  defineOnGlobals('navigator', { userAgent: 'test' });
}
function restoreEnv() {
  defineOnGlobals('fetch', REAL_FETCH);
  defineOnGlobals('navigator', REAL_NAV);
}

const metric = (over: Record<string, unknown> = {}) => ({
  name: 'LCP', value: 2500.7, rating: 'good', delta: 12.4, id: 'v1', navigationType: 'navigate', ...over,
});

beforeEach(() => {
  captured.cb = null;
  sendBeacon.mockClear();
  (navigator as Nav).sendBeacon = sendBeacon;
});
afterEach(() => {
  cleanup();
  restoreEnv();
  delete (REAL_NAV as Nav).sendBeacon;
  vi.restoreAllMocks();
});

describe('<WebVitalsReporter />', () => {
  it('beacons a rounded metric payload to the vitals endpoint', async () => {
    render(<WebVitalsReporter />);
    expect(captured.cb).toBeTypeOf('function');
    captured.cb!(metric());

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toBe('/api/web-vitals');
    const payload = JSON.parse(await blob.text());
    expect(payload).toMatchObject({
      metric: 'LCP', value: 2501, rating: 'good', delta: 12,
      id: 'v1', navigationType: 'navigate',
    });
    expect(typeof payload.ts).toBe('number');
    expect(typeof payload.url).toBe('string');
  });

  it('rounds fractional values and deltas to the nearest integer', async () => {
    render(<WebVitalsReporter />);
    captured.cb!(metric({ name: 'CLS', value: 0.1249, delta: 0.5 }));
    const [, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    const payload = JSON.parse(await blob.text());
    expect(payload.value).toBe(0); // 0.1249 → 0
    expect(payload.delta).toBe(1); // 0.5 → 1
  });

  it('falls back to fetch keepalive when sendBeacon is unavailable', () => {
    dropSendBeacon();
    const fetchMock = installFetchMock();
    render(<WebVitalsReporter />);
    captured.cb!(metric({ name: 'INP', value: 200.4 }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/web-vitals');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
    expect(JSON.parse(String(init?.body))).toMatchObject({ metric: 'INP', value: 200 });
  });

  it('renders nothing', () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container).toBeEmptyDOMElement();
  });
});
