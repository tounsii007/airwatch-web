// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentsClient } from './IncidentsClient';

const toastFns = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('@/app/(admin)/Toast', () => ({ useToast: () => toastFns }));
vi.mock('@/app/(admin)/ClientTime', () => ({
  ClientTime: ({ iso }: { iso: string }) => <span data-testid="ts">{iso}</span>,
}));
vi.mock('@/app/(admin)/admin/shared/components/Markdown', () => ({
  Markdown: ({ children }: { children: string }) => <div data-testid="md">{children}</div>,
}));

const sample = {
  id: 7,
  title: 'Database failover',
  severity: 'critical',
  started_at: '2026-05-09T11:00:00Z',
  ended_at: null,
  duration_min: null,
  started_by: 'admin',
  ended_by: null,
  summary: 'PG primary went read-only',
  postmortem: null,
  linked_alerts: 3,
};

interface FetchCall { url: string; method?: string; body?: string; headers?: Record<string, string> }

function mockFetch() {
  const calls: FetchCall[] = [];
  globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      body: typeof init?.body === 'string' ? init.body : undefined,
      headers: init?.headers as Record<string, string> | undefined,
    });
    if (url.startsWith('/admin/api/incidents?')) {
      return new Response(JSON.stringify({ incidents: [sample] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  return calls;
}

describe('<IncidentsClient />', () => {
  beforeEach(() => {
    Object.values(toastFns).forEach((fn) => fn.mockClear());
    // happy-dom doesn't ship window.confirm by default — define it as
    // an own property so tests can rely on it returning true.
    Object.defineProperty(window, 'confirm', {
      value: () => true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the initial incidents passed via props (no fetch round-trip)', () => {
    mockFetch();
    render(<IncidentsClient initialIncidents={[sample]} csrfToken="csrf-1" />);
    expect(screen.getByText(/#7 · Database failover/)).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText(/3 linked alerts/)).toBeInTheDocument();
  });

  it('POSTs the new-incident form with X-CSRF-Token header + URL-encoded body', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<IncidentsClient initialIncidents={[]} csrfToken="csrf-1" />);

    await user.type(screen.getByPlaceholderText(/Database failover during deploy/i), 'Disk full');
    await user.type(screen.getByPlaceholderText(/One-line description/i), 'pg ran out of space');
    await user.click(screen.getByRole('button', { name: /open incident/i }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url === '/admin/api/incidents');
      expect(post).toBeDefined();
      expect(post!.headers?.['X-CSRF-Token']).toBe('csrf-1');
      expect(post!.body).not.toContain('_csrf');
      expect(post!.body).toContain('title=Disk+full');
      expect(post!.body).toContain('summary=pg+ran+out+of+space');
    });
    expect(toastFns.success).toHaveBeenCalledWith('Incident opened');
  });

  it('does not POST when csrfToken is empty (button click is a no-op)', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<IncidentsClient initialIncidents={[]} csrfToken="" />);

    await user.type(screen.getByPlaceholderText(/Database failover during deploy/i), 'X');
    await user.click(screen.getByRole('button', { name: /open incident/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(calls.find((c) => c.method === 'POST')).toBeUndefined();
  });

  it('Close button POSTs to /close with X-CSRF-Token header, after a confirm() prompt', async () => {
    const calls = mockFetch();
    const user = userEvent.setup();
    render(<IncidentsClient initialIncidents={[sample]} csrfToken="csrf-1" />);

    await user.click(screen.getByRole('button', { name: /close incident/i }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && /\/close$/.test(c.url));
      expect(post).toBeDefined();
      expect(post!.url).not.toContain('_csrf');
      expect(post!.headers?.['X-CSRF-Token']).toBe('csrf-1');
    });
  });

  it('shows error toast on a 500 response from /close', async () => {
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && /\/close$/.test(url)) return new Response('boom', { status: 500 });
      if (url.startsWith('/admin/api/incidents?')) return new Response(JSON.stringify({ incidents: [sample] }), { status: 200 });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<IncidentsClient initialIncidents={[sample]} csrfToken="csrf-1" />);

    await user.click(screen.getByRole('button', { name: /close incident/i }));
    await waitFor(() => expect(toastFns.error).toHaveBeenCalledWith('Could not close'));
  });

  it('renders the empty-state copy when the list is empty', () => {
    mockFetch();
    render(<IncidentsClient initialIncidents={[]} csrfToken="csrf-1" />);
    expect(screen.getByText(/no incidents yet/i)).toBeInTheDocument();
  });
});
