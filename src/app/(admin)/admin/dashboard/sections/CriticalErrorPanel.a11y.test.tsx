// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { CriticalErrorPanel } from './CriticalErrorPanel';

/**
 * Accessibility smoke tests for the dashboard CriticalErrorPanel.
 *
 * The widget is a live-updating list with role=button rows that toggle
 * a stack-trace pre-block. axe-core checks: no missing labels, no
 * malformed aria-expanded, no keyboard-trap, no contrast meta issues
 * the static markup can self-report.
 */
describe('<CriticalErrorPanel /> — a11y', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          totalSeen: 12,
          buffered: 1,
          entries: [{
            ts: '2026-05-09T12:00:00Z',
            level: 'ERROR',
            logger: 'com.airwatch.flights.PollerService',
            message: 'Airlabs 429',
            signature: 'PollerService:429',
            throwable: 'java.lang.RuntimeException: 429\n\tat com.airwatch.PollerService.poll(PollerService.java:42)',
          }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('has no axe violations after data loads', async () => {
    const { container, findByText } = render(<CriticalErrorPanel />);
    await findByText('Airlabs 429');
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no axe violations in the empty state', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ totalSeen: 0, buffered: 0, entries: [] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const { container } = render(<CriticalErrorPanel />);
    await waitFor(async () => {
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});
