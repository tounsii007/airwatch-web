// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import type { FlightRouteInfo } from '@/lib/types';
import { CompactTimesRow } from './CompactTimesRow';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

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

const base: FlightRouteInfo = {
  scheduledDep: '2026-05-30T08:15:00Z',
  scheduledArr: '2026-05-30T11:45:00Z',
  status: 'EN_ROUTE',
} as FlightRouteInfo;

describe('<CompactTimesRow />', () => {
  it('renders nothing without times or a photo', () => {
    const { container } = render(
      <CompactTimesRow language="en" routeInfo={null} photoUrl={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the scheduled departure time', () => {
    render(<CompactTimesRow language="en" routeInfo={base} photoUrl={null} />);
    expect(screen.getByText('dep')).toBeInTheDocument();
    expect(screen.getByText('08:15')).toBeInTheDocument();
  });

  it('shows the scheduled arrival time when present', () => {
    render(<CompactTimesRow language="en" routeInfo={base} photoUrl={null} />);
    expect(screen.getByText('arr')).toBeInTheDocument();
    expect(screen.getByText('11:45')).toBeInTheDocument();
  });

  it('omits the arrival when no arrival time is known', () => {
    render(
      <CompactTimesRow
        language="en"
        routeInfo={
          { scheduledDep: '2026-05-30T08:15:00Z', status: 'SCHEDULED' } as FlightRouteInfo
        }
        photoUrl={null}
      />,
    );
    expect(screen.queryByText('arr')).toBeNull();
  });

  it('surfaces a departure delay badge', () => {
    render(
      <CompactTimesRow
        language="en"
        routeInfo={{ ...base, depDelayed: 10 } as FlightRouteInfo}
        photoUrl={null}
      />,
    );
    expect(screen.getByText('+10min')).toBeInTheDocument();
  });

  it('hides the delay badge for a non-positive delay', () => {
    render(
      <CompactTimesRow
        language="en"
        routeInfo={{ ...base, depDelayed: 0 } as FlightRouteInfo}
        photoUrl={null}
      />,
    );
    expect(screen.queryByText(/min$/)).toBeNull();
  });

  it('renders the aircraft thumbnail when a photo URL is supplied', () => {
    const { container } = render(
      <CompactTimesRow language="en" routeInfo={base} photoUrl="/jet.jpg" />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/jet.jpg');
  });

  it('renders the photo alone when no times are available', () => {
    const { container } = render(
      <CompactTimesRow language="en" routeInfo={null} photoUrl="/jet.jpg" />,
    );
    expect(screen.queryByText('dep')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <CompactTimesRow language="en" routeInfo={base} photoUrl="/jet.jpg" />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
