// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import type { AircraftState } from '@/lib/types';
import { ResultTile } from './ResultTile';

const fresh = vi.hoisted(() => ({ isCached: vi.fn(), ageSeconds: vi.fn() }));
vi.mock('@/lib/flights/aircraftFreshness', () => ({
  isCached: fresh.isCached,
  ageSeconds: fresh.ageSeconds,
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt = '',
    onError,
    src,
    width,
    height,
    className,
  }: {
    alt?: string;
    onError?: ReactEventHandler<HTMLImageElement>;
    src?: string;
    width?: number;
    height?: number;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={onError}
    />
  ),
}));

const noop = () => {};

describe('<ResultTile />', () => {
  it('renders the title', () => {
    render(<ResultTile type="airline" title="Lufthansa" query="" onClick={noop} />);
    expect(screen.getByText('Lufthansa')).toBeInTheDocument();
  });

  it('fires onClick when the tile is pressed', () => {
    const onClick = vi.fn();
    render(<ResultTile type="flight" title="DLH123" query="" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('highlights the matching portion of the title', () => {
    render(<ResultTile type="airline" title="Lufthansa" query="luft" onClick={noop} />);
    const hit = screen.getByText('Luft');
    expect(hit.className).toContain('--primary');
    expect(screen.getByText('hansa')).toBeInTheDocument();
  });

  it('does not highlight for queries shorter than two characters', () => {
    render(<ResultTile type="airline" title="Lufthansa" query="l" onClick={noop} />);
    expect(screen.getByText('Lufthansa')).toBeInTheDocument();
    expect(screen.queryByText('Luft')).toBeNull();
  });

  it('renders the subtitle', () => {
    render(
      <ResultTile type="airport" title="FRA" subtitle="Frankfurt" query="" onClick={noop} />,
    );
    expect(screen.getByText('Frankfurt')).toBeInTheDocument();
  });

  it('renders an icon and no image when no logo URL is given', () => {
    const { container } = render(
      <ResultTile type="flight" title="DLH123" query="" onClick={noop} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the logo image when a logo URL is given', () => {
    const { container } = render(
      <ResultTile type="airline" title="Lufthansa" query="" onClick={noop} logoUrl="/lh.png" />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/lh.png');
  });

  it('renders a status badge', () => {
    render(
      <ResultTile type="flight" title="DLH123" status="scheduled" query="" onClick={noop} />,
    );
    expect(screen.getByText('SCHED')).toBeInTheDocument();
  });

  it('renders an offline badge for a cached aircraft', () => {
    fresh.isCached.mockReturnValue(true);
    fresh.ageSeconds.mockReturnValue(60);
    render(
      <ResultTile
        type="flight"
        title="DLH123"
        query=""
        onClick={noop}
        aircraft={{ icao24: 'abc123' } as AircraftState}
      />,
    );
    expect(screen.getByText('OFFLINE 60s')).toBeInTheDocument();
  });

  it('hides the offline badge for a live aircraft', () => {
    fresh.isCached.mockReturnValue(false);
    render(
      <ResultTile
        type="flight"
        title="DLH123"
        query=""
        onClick={noop}
        aircraft={{ icao24: 'abc123' } as AircraftState}
      />,
    );
    expect(screen.queryByText(/OFFLINE/)).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ResultTile
        type="airline"
        title="Lufthansa"
        subtitle="Germany"
        status="scheduled"
        query="luft"
        onClick={noop}
        logoUrl="/lh.png"
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
