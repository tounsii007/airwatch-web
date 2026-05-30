// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { MobileHeader } from './MobileHeader';

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

const base = {
  airlineIata: undefined as string | undefined,
  airlineName: 'Lufthansa' as string | undefined,
  displayCallsign: 'DLH123',
  flightStatus: 'en-route' as string | undefined,
  photoUrl: null as string | null,
  actions: (
    <button type="button">act</button>
  ),
};

describe('<MobileHeader />', () => {
  it('renders the callsign and airline name', () => {
    render(<MobileHeader {...base} />);
    expect(screen.getByText('DLH123')).toBeInTheDocument();
    expect(screen.getByText('Lufthansa')).toBeInTheDocument();
  });

  it('omits the airline name when not provided', () => {
    render(<MobileHeader {...base} airlineName={undefined} />);
    expect(screen.queryByText('Lufthansa')).toBeNull();
  });

  it('renders the flight-status badge', () => {
    render(<MobileHeader {...base} flightStatus="en-route" />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('renders the action slot', () => {
    render(<MobileHeader {...base} />);
    expect(screen.getByRole('button', { name: 'act' })).toBeInTheDocument();
  });

  it('renders the thumbnail only when a photo URL is supplied', () => {
    const { container } = render(<MobileHeader {...base} photoUrl="/jet.jpg" />);
    // airlineIata is undefined → AirlineLogo shows its plane fallback (no img),
    // so the only img on screen is the photo thumbnail.
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/jet.jpg');
  });

  it('renders no image without a photo or airline logo', () => {
    const { container } = render(
      <MobileHeader {...base} photoUrl={null} airlineIata={undefined} />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the airline logo when an IATA code is supplied', () => {
    const { container } = render(<MobileHeader {...base} airlineIata="LH" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://pics.avs.io/200/80/LH.png',
    );
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <MobileHeader {...base} airlineIata="LH" photoUrl="/jet.jpg" />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
