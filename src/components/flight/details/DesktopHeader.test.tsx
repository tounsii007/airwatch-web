// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { DesktopHeader } from './DesktopHeader';

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
  icao24: '3c6444',
  flightStatus: 'en-route' as string | undefined,
  originCountry: 'Germany' as string | undefined,
  actions: (
    <button type="button">act</button>
  ),
};

describe('<DesktopHeader />', () => {
  it('renders the callsign as a heading', () => {
    render(<DesktopHeader {...base} />);
    expect(screen.getByRole('heading', { name: 'DLH123' })).toBeInTheDocument();
  });

  it('upper-cases the ICAO24 hex', () => {
    render(<DesktopHeader {...base} />);
    expect(screen.getByText('3C6444')).toBeInTheDocument();
  });

  it('renders the origin-country pill when provided', () => {
    render(<DesktopHeader {...base} originCountry="Germany" />);
    expect(screen.getByText('Germany')).toBeInTheDocument();
  });

  it('omits the country pill when no origin country is known', () => {
    render(<DesktopHeader {...base} originCountry={undefined} />);
    expect(screen.queryByText('Germany')).toBeNull();
  });

  it('renders the status badge', () => {
    render(<DesktopHeader {...base} flightStatus="en-route" />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('renders the airline name and action slot', () => {
    render(<DesktopHeader {...base} />);
    expect(screen.getByText('Lufthansa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'act' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<DesktopHeader {...base} airlineIata="LH" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
