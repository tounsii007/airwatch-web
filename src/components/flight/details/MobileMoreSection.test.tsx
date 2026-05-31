// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import {
  formatCoord,
  formatVerticalRateFpm,
} from '@/components/flight/details/flightDisplayUtils';
import type {
  AircraftMetadata,
  AircraftState,
  FlightRouteInfo,
} from '@/lib/types';
import { MobileMoreSection } from './MobileMoreSection';

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

const aircraft = {
  verticalRate: 5,
  latitude: 50.11,
  longitude: 8.68,
  squawk: '7700',
} as AircraftState;

const metadata = {
  manufacturer: 'Boeing',
  model: '737-800',
  operatorName: 'Lufthansa',
  registration: 'D-ABCD',
  typecode: 'B738',
} as AircraftMetadata;

const routeInfo = {
  scheduledDep: '2026-05-30T08:15:00Z',
  scheduledArr: '2026-05-30T11:45:00Z',
  status: 'EN_ROUTE',
} as FlightRouteInfo;

function renderSection(overrides: Partial<React.ComponentProps<typeof MobileMoreSection>> = {}) {
  const props = {
    language: 'en' as const,
    selectedAircraft: aircraft,
    metadata,
    photoUrl: '/jet.jpg' as string | null,
    routeInfo: routeInfo as FlightRouteInfo | null,
    flightStatus: 'EN_ROUTE' as string | undefined,
    ...overrides,
  };
  return render(<MobileMoreSection {...props} />);
}

describe('<MobileMoreSection />', () => {
  it('renders the manufacturer, model, and operator', () => {
    renderSection();
    expect(screen.getByText('Boeing 737-800')).toBeInTheDocument();
    expect(screen.getByText('operated_by Lufthansa')).toBeInTheDocument();
  });

  it('renders the registration and typecode tags', () => {
    renderSection();
    expect(screen.getByText('D-ABCD')).toBeInTheDocument();
    expect(screen.getByText('B738')).toBeInTheDocument();
  });

  it('renders the photo thumbnail when a photo URL is present', () => {
    const { container } = renderSection({ photoUrl: '/jet.jpg' });
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/jet.jpg');
  });

  it('renders the vertical-rate, lat, and lon detail cells', () => {
    renderSection();
    expect(screen.getByText(formatVerticalRateFpm(5))).toBeInTheDocument();
    expect(screen.getByText(formatCoord(50.11))).toBeInTheDocument();
    expect(screen.getByText(formatCoord(8.68))).toBeInTheDocument();
  });

  it('highlights an emergency squawk cell', () => {
    renderSection();
    // The value flows through <TickingValue>, which wraps the text in its
    // own span; the --error highlight lives on the parent MiniCell span.
    expect(screen.getByText('7700').parentElement?.className).toContain(
      '--error',
    );
  });

  it('omits the squawk cell when no squawk is known', () => {
    renderSection({
      selectedAircraft: { ...aircraft, squawk: undefined } as AircraftState,
    });
    expect(screen.queryByText('squawk_label')).toBeNull();
  });

  it('renders the scheduled times row when a departure time exists', () => {
    renderSection();
    expect(screen.getByText('08:15')).toBeInTheDocument();
  });

  it('omits the times row when no departure time exists', () => {
    renderSection({ routeInfo: null });
    expect(screen.queryByText('08:15')).toBeNull();
  });

  it('renders without metadata', () => {
    renderSection({ metadata: null });
    expect(screen.queryByText('Boeing 737-800')).toBeNull();
    // Detail grid still renders the coordinate cells.
    expect(screen.getByText(formatCoord(50.11))).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderSection();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
