// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FleetInfoCard } from './FleetInfoCard';

/**
 * <FleetInfoCard /> tests.
 *
 * Render strategy contract:
 *  - while loading → renders nothing (avoid layout pop)
 *  - on fetch error → renders nothing
 *  - on empty payload → renders nothing
 *  - on registry-only → only the Registry subsection
 *  - on sightings-only → only the Sightings subsection
 *  - on both → both, with year arithmetic + relative-time strings
 */

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
}

function mockFetchReject() {
  globalThis.fetch = vi.fn(async () => { throw new Error('boom'); }) as unknown as typeof fetch;
}

describe('<FleetInfoCard />', () => {
  beforeEach(() => {
    // Default: a "no data" payload so absence-of-mock doesn't crash.
    mockFetch({ icao24: 'abc123' });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('renders nothing on the initial loading tick', () => {
    const { container } = render(<FleetInfoCard icao24="abc123" language="en" />);
    // Synchronous snapshot — useEffect hasn't fired its fetch yet.
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when both registry and sightings are empty', async () => {
    mockFetch({ icao24: 'abc123' });
    const { container } = render(<FleetInfoCard icao24="abc123" language="en" />);
    // Wait a microtask + setState flush.
    await new Promise((r) => setTimeout(r, 5));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on a fetch error', async () => {
    mockFetchReject();
    const { container } = render(<FleetInfoCard icao24="abc123" language="en" />);
    await new Promise((r) => setTimeout(r, 5));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on a non-2xx upstream', async () => {
    mockFetch({ error: 'boom' }, 503);
    const { container } = render(<FleetInfoCard icao24="abc123" language="en" />);
    await new Promise((r) => setTimeout(r, 5));
    expect(container.firstChild).toBeNull();
  });

  it('renders only the registry section when sightings are absent', async () => {
    mockFetch({
      icao24: 'abc123',
      registry: {
        Registration: 'D-AIBC',
        RegisteredOwners: 'Lufthansa',
        ManufacturerYear: '2018',
        OperatorFlagCode: 'DLH',
      },
    });
    render(<FleetInfoCard icao24="abc123" language="en" />);
    await waitFor(() => screen.getByText('Lufthansa'));
    expect(screen.getByText('Lufthansa')).toBeInTheDocument();
    expect(screen.getByText(/2018/)).toBeInTheDocument();
    expect(screen.getByText('DLH')).toBeInTheDocument();
    // No sightings section header.
    expect(screen.queryByText('Sightings')).toBeNull();
  });

  it('renders only the sightings section when registry is absent', async () => {
    mockFetch({
      icao24: 'abc123',
      sightings: {
        firstSeenAt: '2025-09-01T10:00:00Z',
        lastSeenAt: '2026-05-09T14:30:00Z',
        count: 4242,
      },
    });
    render(<FleetInfoCard icao24="abc123" language="en" />);
    await waitFor(() => screen.getByText('4,242'));
    expect(screen.getByText('4,242')).toBeInTheDocument();
    expect(screen.queryByText('Registry')).toBeNull();
  });

  it('renders both sections with year arithmetic when both are present', async () => {
    mockFetch({
      icao24: 'abc123',
      registry: { Registration: 'D-AIBC', RegisteredOwners: 'Lufthansa', Built: '2018' },
      sightings: { firstSeenAt: '2025-09-01T10:00:00Z', lastSeenAt: '2026-05-10T14:30:00Z', count: 100 },
    });
    render(<FleetInfoCard icao24="abc123" language="en" />);
    await waitFor(() => screen.getByText('Lufthansa'));
    // Year displayed alongside age. The exact age depends on the
    // current year (2026) so we assert a relaxed form.
    expect(screen.getByText(/2018 \(\d+ yrs\)/)).toBeInTheDocument();
    // Sighting count formatted with locale separator.
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('drops a junk year value cleanly (out of plausible range)', async () => {
    mockFetch({
      icao24: 'abc123',
      registry: { Registration: 'D-AIBC', RegisteredOwners: 'Lufthansa', Built: '0042' },
    });
    render(<FleetInfoCard icao24="abc123" language="en" />);
    await waitFor(() => screen.getByText('Lufthansa'));
    // Owner present, but no built/year row because 42 fails sanity-check.
    expect(screen.queryByText('Built')).toBeNull();
  });
});
