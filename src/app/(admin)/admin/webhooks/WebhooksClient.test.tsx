// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WebhooksClient } from './WebhooksClient';

const toastFns = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('@/app/(admin)/Toast', () => ({ useToast: () => toastFns }));
vi.mock('@/app/(admin)/ClientTime', () => ({
  ClientTime: ({ iso }: { iso: string }) => <span data-testid="ts">{iso}</span>,
}));

const sample = {
  id: 1,
  name: 'Slack ops',
  url: 'https://hooks.slack.example/x',
  secretMasked: 'sk_***abcd',
  kindFilter: null,
  severityFilter: 'critical',
  enabled: true,
  createdAt: '2026-05-01T00:00:00Z',
  createdBy: 'admin',
  lastCalledAt: '2026-05-09T12:00:00Z',
  lastStatus: 200,
  lastError: null,
  successCount: 12,
  failureCount: 0,
};

interface FetchCall { url: string; method?: string; body?: string; headers?: Record<string, string> }

function mockFetch(extra: Record<string, (init?: RequestInit) => Response | Promise<Response>> = {}) {
  const calls: FetchCall[] = [];
  globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      body: typeof init?.body === 'string' ? init.body : undefined,
      headers: init?.headers as Record<string, string> | undefined,
    });
    for (const [matcher, handler] of Object.entries(extra)) {
      if (url.includes(matcher)) return handler(init);
    }
    if (url.startsWith('/admin/api/webhooks') && (!init?.method || init.method === 'GET')) {
      return new Response(JSON.stringify([sample]), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  return calls;
}

describe('<WebhooksClient />', () => {
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

  it('renders one row per initial webhook', () => {
    mockFetch();
    render(<WebhooksClient initialWebhooks={[sample]} csrfToken="csrf-1" />);
    expect(screen.getByText('Slack ops')).toBeInTheDocument();
    expect(screen.getByText(sample.url)).toBeInTheDocument();
  });

  it('POSTs the create form with _csrf in the URL + JSON body', async () => {
    const calls = mockFetch({
      '/admin/api/webhooks': (init) => {
        if (init?.method === 'POST') {
          return new Response(JSON.stringify({ id: 99, secret: 'sk_test_revealed' }), { status: 200 });
        }
        return new Response(JSON.stringify([sample]), { status: 200 });
      },
    });
    const user = userEvent.setup();
    render(<WebhooksClient initialWebhooks={[]} csrfToken="csrf-abc" />);

    await user.type(screen.getByPlaceholderText(/PagerDuty primary/i), 'New hook');
    const urlInput = screen.getByDisplayValue('https://');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://hook.example.com/x');
    await user.click(screen.getByRole('button', { name: /create webhook/i }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST');
      expect(post).toBeDefined();
      expect(post!.url).toContain('_csrf=csrf-abc');
      expect(post!.headers?.['Content-Type']).toBe('application/json');
      const body = JSON.parse(post!.body!);
      expect(body.name).toBe('New hook');
      expect(body.url).toBe('https://hook.example.com/x');
    });
    expect(toastFns.success).toHaveBeenCalledWith('Webhook created');
  });

  it('shows the revealed secret after a successful create', async () => {
    mockFetch({
      '/admin/api/webhooks': (init) => init?.method === 'POST'
        ? new Response(JSON.stringify({ id: 99, secret: 'sk_test_REVEALED' }), { status: 200 })
        : new Response(JSON.stringify([sample]), { status: 200 }),
    });
    const user = userEvent.setup();
    render(<WebhooksClient initialWebhooks={[]} csrfToken="csrf-abc" />);

    await user.type(screen.getByPlaceholderText(/PagerDuty primary/i), 'X');
    const urlInput = screen.getByDisplayValue('https://');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://x.example/h');
    await user.click(screen.getByRole('button', { name: /create webhook/i }));

    await waitFor(() => {
      expect(screen.getByText(/sk_test_REVEALED/)).toBeInTheDocument();
    });
  });

  it('toggleEnable POSTs to /enable when row is currently disabled', async () => {
    const disabled = { ...sample, enabled: false };
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<WebhooksClient initialWebhooks={[disabled]} csrfToken="csrf-1" />);

    await user.click(screen.getByRole('button', { name: /enable/i }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url.includes('/enable?'));
      expect(post).toBeDefined();
      expect(post!.url).toContain('_csrf=csrf-1');
    });
  });

  it('test button shows error toast on a failed test outcome', async () => {
    const calls = mockFetch({
      '/test?': () => new Response(JSON.stringify({
        ok: false, status: 500, latencyMs: 150, attempts: 3, error: 'upstream timeout',
      }), { status: 200 }),
    });
    const user = userEvent.setup();
    render(<WebhooksClient initialWebhooks={[sample]} csrfToken="csrf-1" />);

    await user.click(screen.getByRole('button', { name: /^test$/i }));

    await waitFor(() => {
      expect(toastFns.error).toHaveBeenCalled();
      const lastErrorCall = toastFns.error.mock.calls.at(-1)?.[0] as string;
      expect(lastErrorCall).toContain('upstream timeout');
    });
    expect(calls.find((c) => c.url.includes('/test?'))).toBeDefined();
  });

  it('delete sends DELETE with _csrf in the URL', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<WebhooksClient initialWebhooks={[sample]} csrfToken="csrf-1" />);

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      const del = calls.find((c) => c.method === 'DELETE');
      expect(del).toBeDefined();
      expect(del!.url).toContain('_csrf=csrf-1');
      expect(del!.url).toContain('/admin/api/webhooks/1');
    });
  });

  it('does not POST create when csrfToken is empty', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<WebhooksClient initialWebhooks={[]} csrfToken="" />);

    await user.type(screen.getByPlaceholderText(/PagerDuty primary/i), 'X');
    const urlInput = screen.getByDisplayValue('https://');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://x.example/h');
    await user.click(screen.getByRole('button', { name: /create webhook/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(calls.find((c) => c.method === 'POST')).toBeUndefined();
  });
});
