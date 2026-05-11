// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoGallery } from './PhotoGallery';

vi.mock('@/lib/constants', () => ({
  API: {
    aircraftPhoto: (hex: string) => `/api/proxy/photo/${hex}`,
    imageProxy: (url: string) => url,
  },
}));

const SAMPLE = {
  photos: [
    {
      thumbnail_large: { src: 'https://cdn.example/large/a.jpg' },
      thumbnail:       { src: 'https://cdn.example/thumb/a.jpg' },
      photographer:    'Alice',
      link:            'https://planespotters.net/photo/123/a',
    },
    {
      thumbnail_large: { src: 'https://cdn.example/large/b.jpg' },
      photographer:    'Bob',
      link:            '',
    },
    {
      thumbnail_large: { src: 'https://cdn.example/large/c.jpg' },
      photographer:    'Charlie',
      link:            'https://planespotters.net/photo/456/c',
    },
  ],
};

function mockPhotosFetch(payload: unknown = SAMPLE) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(payload), {
    status: 200, headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
}

describe('<PhotoGallery />', () => {
  beforeEach(() => mockPhotosFetch());
  afterEach(() => { vi.restoreAllMocks(); });

  it('shows the loading state then the first photo + 1/3 counter', async () => {
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));
    expect(screen.getByAltText(/Aircraft photograph 1 of 3 by Alice/)).toBeInTheDocument();
  });

  it('ArrowRight advances; ArrowLeft retreats; counter updates', async () => {
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    // Wraps around.
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('Home and End jump to the first / last photo', async () => {
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));

    fireEvent.keyDown(window, { key: 'End' });
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Home' });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('Esc fires onClose', async () => {
    const onClose = vi.fn();
    render(<PhotoGallery icao24="abc123" onClose={onClose} />);
    await waitFor(() => screen.getByText('1 / 3'));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders the photographer link when the upstream provided one', async () => {
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));

    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', 'https://planespotters.net/photo/123/a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders plain text photographer name when no link present', async () => {
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // → Bob (no link)

    expect(screen.queryByRole('link', { name: 'Bob' })).toBeNull();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it('thumbnail click navigates to that photo', async () => {
    const user = userEvent.setup();
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));

    await user.click(screen.getByRole('tab', { name: 'Photo 3' }));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('horizontal swipe left advances; right retreats', async () => {
    const { container } = render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));

    const dialog = container.querySelector('[role="dialog"]')!;
    // Swipe left (negative dx) → next photo.
    fireEvent.touchStart(dialog, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(dialog,   { changedTouches: [{ clientX: 100 }] });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    // Swipe right (positive dx) → previous photo.
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(dialog,   { changedTouches: [{ clientX: 250 }] });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('a swipe shorter than the threshold does not navigate', async () => {
    const { container } = render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));

    const dialog = container.querySelector('[role="dialog"]')!;
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(dialog,   { changedTouches: [{ clientX: 130 }] }); // 30 px < 50
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('renders the empty state when the upstream returns no photos', async () => {
    mockPhotosFetch({ photos: [] });
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('No photos available'));
  });

  it('renders the empty state when fetch fails', async () => {
    globalThis.fetch = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('No photos available'));
  });

  it('thumbnail count matches the number of photos returned', async () => {
    render(<PhotoGallery icao24="abc123" onClose={() => {}} />);
    await waitFor(() => screen.getByText('1 / 3'));
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
