// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProbesClient } from './ProbesClient';

const toastFns = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('@/app/(admin)/Toast', () => ({ useToast: () => toastFns }));
vi.mock('@/app/(admin)/ClientTime', () => ({
  ClientTime: ({ iso }: { iso: string }) => <span data-testid="ts">{iso}</span>,
}));
vi.mock('@/app/(admin)/admin/shared/live/AdminEventStream', () => ({
  useAdminEvents: () => {},
}));

const sample = {
  id: 1,
  name: 'airlabs reachability',
  method: 'GET',
  url: 'https://api.airlabs.co/api/v9/ping',
  expectStatus: 200,
  expectBody: null,
  intervalMin: 5,
  timeoutSec: 10,
  failThreshold: 3,
  enabled: true,
  consecutiveFailures: 0,
  lastRunAt: '2026-05-09T12:00:00Z',
  lastStatus: 200,
  lastLatencyMs: 142,
};

interface FetchCall { url: string; method?: string; body?: string }

function mockFetch(extra: Record<string, (init?: RequestInit) => Response | Promise<Response>> = {}) {
  const calls: FetchCall[] = [];
  globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    for (const [matcher, handler] of Object.entries(extra)) {
      if (url.includes(matcher)) return handler(init);
    }
    if (url.startsWith('/admin/api/probes') && (!init?.method || init.method === 'GET')) {
      return new Response(JSON.stringify({ probes: [sample] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  return calls;
}

describe('<ProbesClient />', () => {
  beforeEach(() => {
    Object.values(toastFns).forEach((fn) => fn.mockClear());
    Object.defineProperty(window, 'confirm', {
      value: () => true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the initial probes from props', () => {
    mockFetch();
    render(<ProbesClient initialProbes={[sample]} csrfToken="csrf-1" />);
    expect(screen.getByText('airlabs reachability')).toBeInTheDocument();
  });

  it('POSTs the create form with _csrf in the URL-encoded body', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<ProbesClient initialProbes={[]} csrfToken="csrf-abc" />);

    await user.type(screen.getByPlaceholderText(/airlabs reachability/i), 'New probe');
    const urlInput = screen.getByDisplayValue('https://');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://x.example/ping');
    await user.click(screen.getByRole('button', { name: /add probe/i }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/admin/api/probes');
      expect(post).toBeDefined();
      expect(post!.body).toContain('_csrf=csrf-abc');
      expect(post!.body).toContain('name=New+probe');
      expect(post!.body).toContain('url=https');
    });
    expect(toastFns.success).toHaveBeenCalledWith('Probe "New probe" created');
  });

  it('toggleEnabled POSTs to /enabled with the inverted state', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<ProbesClient initialProbes={[sample]} csrfToken="csrf-1" />);

    // sample.enabled = true → button reads "Pause"; toggling sends "enabled=false"
    await user.click(screen.getByRole('button', { name: /^pause$/i }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url.includes('/enabled?'));
      expect(post).toBeDefined();
      expect(post!.url).toContain('enabled=false');
      expect(post!.url).toContain('_csrf=csrf-1');
    });
  });

  it('shows the upstream error message when create returns non-2xx', async () => {
    mockFetch({
      '/admin/api/probes': (init) => init?.method === 'POST'
        ? new Response(JSON.stringify({ message: 'duplicate name' }), { status: 409 })
        : new Response(JSON.stringify({ probes: [] }), { status: 200 }),
    });
    const user = userEvent.setup();
    render(<ProbesClient initialProbes={[]} csrfToken="csrf-1" />);

    await user.type(screen.getByPlaceholderText(/airlabs reachability/i), 'X');
    const urlInput = screen.getByDisplayValue('https://');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://x.example/h');
    await user.click(screen.getByRole('button', { name: /add probe/i }));

    await waitFor(() => expect(toastFns.error).toHaveBeenCalledWith('duplicate name'));
  });

  it('does not POST when csrfToken is empty', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<ProbesClient initialProbes={[]} csrfToken="" />);

    await user.type(screen.getByPlaceholderText(/airlabs reachability/i), 'X');
    const urlInput = screen.getByDisplayValue('https://');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://x.example/h');
    await user.click(screen.getByRole('button', { name: /add probe/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(calls.find((c) => c.method === 'POST')).toBeUndefined();
  });
});
