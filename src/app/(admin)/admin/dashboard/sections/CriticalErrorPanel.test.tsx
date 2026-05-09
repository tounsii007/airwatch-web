// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CriticalErrorPanel } from './CriticalErrorPanel';

interface MockError {
  ts: string;
  level: string;
  logger: string;
  message: string;
  signature: string;
  throwable: string | null;
}

const sampleErrors: MockError[] = [
  {
    ts: '2026-05-09T12:00:00Z',
    level: 'ERROR',
    logger: 'com.airwatch.flights.AirlabsPollerService',
    message: 'Airlabs API rate-limit exceeded',
    signature: 'AirlabsPollerService:rate-limit',
    throwable: 'java.lang.RuntimeException: 429 Too Many Requests\n\tat com.airwatch.flights.AirlabsPollerService.poll(AirlabsPollerService.java:142)\n\tat com.airwatch.flights.PollScheduler.tick(PollScheduler.java:88)',
  },
  {
    ts: '2026-05-09T12:01:30Z',
    level: 'ERROR',
    logger: 'com.airwatch.cache.JdbcCache',
    message: 'No throwable here',
    signature: 'JdbcCache:no-throwable',
    throwable: null,
  },
];

describe('<CriticalErrorPanel />', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ totalSeen: 1234, buffered: sampleErrors.length, entries: sampleErrors }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders entries fetched from /admin/api/monitoring/critical-errors', async () => {
    render(<CriticalErrorPanel />);
    await waitFor(() => {
      expect(screen.getByText('Airlabs API rate-limit exceeded')).toBeInTheDocument();
    });
    // Locale-formatted number can be "1,234" or "1.234" depending on Intl backend.
    expect(screen.getByText(/2 buffered.*1[\s,.]?234 since startup/)).toBeInTheDocument();
  });

  it('expands a row inline on click and shows the full throwable', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<CriticalErrorPanel />);
    await waitFor(() => screen.getByText('Airlabs API rate-limit exceeded'));

    const row = screen.getByRole('button', { name: /expand stack trace/i });
    expect(row.getAttribute('aria-expanded')).toBe('false');

    await user.click(row);

    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/AirlabsPollerService\.poll\(AirlabsPollerService\.java:142\)/)).toBeInTheDocument();
  });

  it('toggles expansion via Enter and Space keys for keyboard users', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<CriticalErrorPanel />);
    await waitFor(() => screen.getByText('Airlabs API rate-limit exceeded'));

    const row = screen.getByRole('button', { name: /expand stack trace/i });
    row.focus();

    await user.keyboard('{Enter}');
    expect(row.getAttribute('aria-expanded')).toBe('true');

    await user.keyboard(' ');
    expect(row.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not render an expand affordance for entries without a throwable', async () => {
    render(<CriticalErrorPanel />);
    await waitFor(() => screen.getByText('No throwable here'));

    // Only the row that has a throwable becomes role=button.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('shows the empty-state copy when the buffer is empty', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ totalSeen: 0, buffered: 0, entries: [] }), { status: 200 }),
    ) as unknown as typeof fetch;

    render(<CriticalErrorPanel />);
    await waitFor(() => {
      expect(screen.getByText(/no errors logged in current window/i)).toBeInTheDocument();
    });
  });

  it('keeps the previous data on a fetch failure (no flash to empty)', async () => {
    render(<CriticalErrorPanel />);
    await waitFor(() => screen.getByText('Airlabs API rate-limit exceeded'));

    globalThis.fetch = vi.fn(async () =>
      new Response('boom', { status: 500 }),
    ) as unknown as typeof fetch;

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText('Airlabs API rate-limit exceeded')).toBeInTheDocument();
  });
});
