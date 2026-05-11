// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/app/(admin)/sourceMapResolver', () => ({
  resolveStackTrace: vi.fn(async (raw: string | undefined) => {
    if (!raw) return raw;
    return raw.replace(/at .+ \(https?:[^)]+\)/g, 'at originalFn (webpack:///./src/lib/foo.ts:42:7)');
  }),
}));

vi.mock('@/app/(admin)/admin/shared/live/useLiveData', () => ({
  useLiveData: vi.fn(),
}));

vi.mock('@/app/(admin)/ClientTime', () => ({
  ClientTime: ({ iso }: { iso: string }) => <span data-testid="client-time">{iso}</span>,
}));

import { useLiveData } from '@/app/(admin)/admin/shared/live/useLiveData';
import { resolveStackTrace } from '@/app/(admin)/sourceMapResolver';
import { FrontendErrorsCard } from './FrontendErrorsCard';

const sampleEntry = {
  id: 1,
  firstSeen: '2026-05-09T11:00:00Z',
  lastSeenAt: '2026-05-09T11:30:00Z',
  occurrenceCount: 7,
  signature: 'TypeError:foo',
  message: 'Cannot read property bar of undefined',
  stack: 'TypeError: Cannot read property bar of undefined\n    at fn (https://app.example/_next/static/chunks/abc.js:1:42)',
  url: 'https://app.example/admin/dashboard',
  userAgent: 'Mozilla/5.0',
  username: 'admin',
  releaseTag: 'v0.42.0',
  sessionId: 'sess_abc',
  breadcrumbs: null,
};

function mockHook(payload: { total: number; buffered: number; entries: typeof sampleEntry[] }) {
  // The component subscribes twice (live and persisted); only one is active at a time.
  vi.mocked(useLiveData).mockImplementation((url: string | null) => ({
    data: url ? payload : null,
    loading: false,
    error: null,
    lastUpdatedMs: null,
    refresh: vi.fn(async () => {}),
    mutate: vi.fn(async () => undefined),
  }) as unknown as ReturnType<typeof useLiveData>);
}

describe('<FrontendErrorsCard /> source-map de-min', () => {
  beforeEach(() => {
    mockHook({ total: 1, buffered: 1, entries: [sampleEntry] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the raw stack initially with a "Resolve" button', async () => {
    const user = userEvent.setup();
    render(<FrontendErrorsCard />);

    await user.click(screen.getByRole('button', { name: /Cannot read property bar/ }));

    expect(screen.getByText(/abc\.js:1:42/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resolve stack via source maps/i })).toBeInTheDocument();
  });

  it('replaces the raw stack with the resolved frames on Resolve click', async () => {
    const user = userEvent.setup();
    render(<FrontendErrorsCard />);

    await user.click(screen.getByRole('button', { name: /Cannot read property bar/ }));
    await user.click(screen.getByRole('button', { name: /resolve stack via source maps/i }));

    await waitFor(() => {
      expect(screen.getByText(/foo\.ts:42:7/)).toBeInTheDocument();
    });
    expect(resolveStackTrace).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /show raw stack/i })).toBeInTheDocument();
  });

  it('toggles back to the raw stack via "Show raw"', async () => {
    const user = userEvent.setup();
    render(<FrontendErrorsCard />);

    await user.click(screen.getByRole('button', { name: /Cannot read property bar/ }));
    await user.click(screen.getByRole('button', { name: /resolve stack via source maps/i }));
    await waitFor(() => screen.getByRole('button', { name: /show raw stack/i }));

    await user.click(screen.getByRole('button', { name: /show raw stack/i }));

    expect(screen.getByText(/abc\.js:1:42/)).toBeInTheDocument();
  });

  it('falls back to the raw stack when the resolver throws', async () => {
    vi.mocked(resolveStackTrace).mockRejectedValueOnce(new Error('map fetch 404'));
    const user = userEvent.setup();
    render(<FrontendErrorsCard />);

    await user.click(screen.getByRole('button', { name: /Cannot read property bar/ }));
    await user.click(screen.getByRole('button', { name: /resolve stack via source maps/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resolution failed: map fetch 404/i)).toBeInTheDocument();
    });
    // Raw view is still on screen.
    expect(screen.getByText(/abc\.js:1:42/)).toBeInTheDocument();
  });

  it('shows the empty-state copy when no entries are present', async () => {
    mockHook({ total: 0, buffered: 0, entries: [] });
    render(<FrontendErrorsCard />);
    expect(await screen.findByText(/No browser-side errors recorded/)).toBeInTheDocument();
  });
});
