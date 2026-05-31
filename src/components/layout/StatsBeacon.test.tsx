// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StatsBeacon } from './StatsBeacon';

const VIEW = '/admin/api/stats/ingest/view';
const MAP_STYLE = '/admin/api/stats/ingest/map-style';

const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

const settings = vi.hoisted(() => ({ mapStyle: 'dark' }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof settings) => unknown) => selector(settings),
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
/** Swap in a beacon-less navigator so the component takes the fetch path.
 *  (sendBeacon lives on Navigator.prototype, so deleting an own-prop on
 *  the real navigator is not enough to flip `'sendBeacon' in navigator`.) */
function dropSendBeacon() {
  defineOnGlobals('navigator', { userAgent: 'test' });
}
function restoreEnv() {
  defineOnGlobals('fetch', REAL_FETCH);
  defineOnGlobals('navigator', REAL_NAV);
}

/** Pull every beacon body posted to a given endpoint, parsed from its Blob. */
async function bodiesFor(endpoint: string): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  for (const call of sendBeacon.mock.calls) {
    if (call[0] !== endpoint) continue;
    const blob = call[1] as Blob;
    out.push(JSON.parse(await blob.text()));
  }
  return out;
}

beforeEach(() => {
  nav.pathname = '/';
  settings.mapStyle = 'dark';
  sendBeacon.mockClear();
  (navigator as Nav).sendBeacon = sendBeacon;
});
afterEach(() => {
  cleanup();
  restoreEnv();
  delete (REAL_NAV as Nav).sendBeacon;
  vi.restoreAllMocks();
});

describe('<StatsBeacon />', () => {
  it('emits a view beacon for the current route', async () => {
    nav.pathname = '/airports';
    render(<StatsBeacon />);
    const bodies = await bodiesFor(VIEW);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ app: 'web', routePath: '/airports', countryCode: null });
  });

  it('does not re-emit a view beacon for the same route on re-render', () => {
    nav.pathname = '/airports';
    const { rerender } = render(<StatsBeacon />);
    rerender(<StatsBeacon />);
    expect(sendBeacon.mock.calls.filter((c) => c[0] === VIEW)).toHaveLength(1);
  });

  it('emits a fresh view beacon when the route changes', async () => {
    nav.pathname = '/airports';
    const { rerender } = render(<StatsBeacon />);
    nav.pathname = '/airlines';
    rerender(<StatsBeacon />);
    const bodies = await bodiesFor(VIEW);
    expect(bodies.map((b) => b.routePath)).toEqual(['/airports', '/airlines']);
  });

  it('skips the admin route group entirely', () => {
    nav.pathname = '/admin/dashboard';
    render(<StatsBeacon />);
    expect(sendBeacon.mock.calls.filter((c) => c[0] === VIEW)).toHaveLength(0);
  });

  it('emits a map-style beacon reflecting the current style', async () => {
    settings.mapStyle = 'satellite';
    render(<StatsBeacon />);
    const bodies = await bodiesFor(MAP_STYLE);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ app: 'web', mapStyle: 'satellite' });
  });

  it('does not duplicate the map-style beacon on an unrelated re-render', () => {
    settings.mapStyle = 'dark';
    const { rerender } = render(<StatsBeacon />);
    rerender(<StatsBeacon />);
    expect(sendBeacon.mock.calls.filter((c) => c[0] === MAP_STYLE)).toHaveLength(1);
  });

  it('falls back to fetch keepalive when sendBeacon is unavailable', () => {
    dropSendBeacon();
    const fetchMock = installFetchMock();
    nav.pathname = '/search';
    render(<StatsBeacon />);
    const viewCall = fetchMock.mock.calls.find((c) => c[0] === VIEW);
    expect(viewCall).toBeDefined();
    expect(viewCall?.[1]).toMatchObject({ method: 'POST', keepalive: true });
  });

  it('renders nothing', () => {
    const { container } = render(<StatsBeacon />);
    expect(container).toBeEmptyDOMElement();
  });
});
