// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { resetRateLimit } from '@/lib/rateLimiter';
import { TopDelaysWidget } from './TopDelaysWidget';

function envelope(items: unknown[]) {
  return new Response(JSON.stringify({ response: items }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}

describe('TopDelaysWidget', () => {
  beforeEach(() => {
    // Reset the cross-test rate-limit state — apiFetch() records 429s and
    // Airlabs error codes into a backoff counter. Without this, a
    // rate-limited test poisons the next test (the apiFetch gate
    // pre-emptively returns synthetic 429s, which collapses every
    // subsequent error into the rate-limited classification).
    resetRateLimit();

    // Default to a happy-path response — individual tests can override.
    globalThis.fetch = vi.fn(async () => envelope([
      { flight_iata: 'LH123', dep_iata: 'FRA', arr_iata: 'MUC', delayed: 45 },
      { flight_iata: 'AF456', dep_iata: 'CDG', arr_iata: 'JFK', delayed: 90 },
      { flight_iata: 'BA789', dep_iata: 'LHR', arr_iata: 'JFK', delayed: 12 },
    ])) as unknown as typeof fetch;
  });

  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('renders the title + subtitle so the widget self-explains', async () => {
    render(<TopDelaysWidget />);
    await waitFor(() => expect(screen.queryByText(/Top delays/i)).toBeTruthy());
  });

  it('sorts flights by delay descending and renders the leaderboard', async () => {
    render(<TopDelaysWidget />);
    // Wait for the rows to land.
    await waitFor(() => expect(screen.queryByText('AF456')).toBeTruthy());

    // The first list item should be AF456 (90 min), not LH123 (45) or BA789 (12).
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('AF456');
    expect(items[1].textContent).toContain('LH123');
    expect(items[2].textContent).toContain('BA789');
  });

  it('renders the empty state when no rows have a positive delay', async () => {
    globalThis.fetch = vi.fn(async () => envelope([
      { flight_iata: 'LH123', delayed: null },
      { flight_iata: 'AF456', delayed: 0 },
    ])) as unknown as typeof fetch;

    render(<TopDelaysWidget />);
    await waitFor(() => expect(screen.queryByText(/No significant delays/i)).toBeTruthy());
  });

  it('renders the rate-limit error copy when the fetch returns 429', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 429 })) as unknown as typeof fetch;
    render(<TopDelaysWidget />);
    await waitFor(() => expect(screen.queryByText(/rate-limited/i)).toBeTruthy());
  });

  it('renders the quota-exhausted copy distinctly from generic errors', async () => {
    // Critical UX — month_limit_exceeded must NOT collapse into the
    // generic "failed to load" copy.
    globalThis.fetch = vi.fn(async () => new Response(
      JSON.stringify({ error: { code: 'month_limit_exceeded' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as unknown as typeof fetch;

    render(<TopDelaysWidget />);
    // Match a substring that's unambiguously in the quota-exhausted copy
    // and not in any of the other error variants.
    await waitFor(
      () => expect(screen.queryByText(/Monthly Airlabs quota/i)).toBeTruthy(),
      { timeout: 3000 },
    );
  });
});
