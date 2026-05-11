// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouteStatsBadge } from './RouteStatsBadge';

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
}

function mockFetchReject() {
  globalThis.fetch = vi.fn(async () => { throw new Error('boom'); }) as unknown as typeof fetch;
}

describe('<RouteStatsBadge />', () => {
  beforeEach(() => mockFetch({ depIata: 'FRA', arrIata: 'JFK', observed: false }));
  afterEach(() => { vi.restoreAllMocks(); });

  it('renders nothing when dep / arr are missing', () => {
    const { container } = render(<RouteStatsBadge depIata={undefined} arrIata="JFK" language="en" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when iata input is malformed', () => {
    // 5 letters and digits — not a valid IATA, should never even fetch.
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const { container } = render(<RouteStatsBadge depIata="FR4" arrIata="JFK" language="en" />);
    expect(container.firstChild).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders nothing on observed:false', async () => {
    mockFetch({ depIata: 'FRA', arrIata: 'JFK', observed: false });
    const { container } = render(<RouteStatsBadge depIata="FRA" arrIata="JFK" language="en" />);
    await new Promise((r) => setTimeout(r, 5));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on a fetch error', async () => {
    mockFetchReject();
    const { container } = render(<RouteStatsBadge depIata="FRA" arrIata="JFK" language="en" />);
    await new Promise((r) => setTimeout(r, 5));
    expect(container.firstChild).toBeNull();
  });

  it('renders today + week + month counts when observed=true', async () => {
    mockFetch({
      depIata: 'FRA', arrIata: 'JFK',
      observed: true, todayCount: 5, weekCount: 32, monthCount: 142,
    });
    render(<RouteStatsBadge depIata="FRA" arrIata="JFK" language="en" />);
    await waitFor(() => screen.getByText('142'));
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('omits today section when todayCount is 0 but week is set', async () => {
    mockFetch({
      depIata: 'FRA', arrIata: 'JFK',
      observed: true, todayCount: 0, weekCount: 12, monthCount: 50,
    });
    render(<RouteStatsBadge depIata="FRA" arrIata="JFK" language="en" />);
    await waitFor(() => screen.getByText('12'));
    // No "0" rendered — empty buckets hide.
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders nothing when observed:true but every bucket is 0', async () => {
    mockFetch({
      depIata: 'FRA', arrIata: 'JFK',
      observed: true, todayCount: 0, weekCount: 0, monthCount: 0,
    });
    const { container } = render(<RouteStatsBadge depIata="FRA" arrIata="JFK" language="en" />);
    await new Promise((r) => setTimeout(r, 5));
    expect(container.firstChild).toBeNull();
  });
});
