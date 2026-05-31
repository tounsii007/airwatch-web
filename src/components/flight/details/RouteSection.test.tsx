// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { RouteSection } from './RouteSection';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
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

describe('<RouteSection />', () => {
  it('shows the loading row while resolving the route', () => {
    render(<RouteSection compact={false} isLoading />);
    expect(screen.getByText('loading_dots')).toBeInTheDocument();
  });

  it('does not render airport codes while loading', () => {
    render(<RouteSection compact={false} isLoading depIata="FRA" arrIata="JFK" />);
    expect(screen.queryByText('FRA')).toBeNull();
    expect(screen.queryByText('JFK')).toBeNull();
  });

  it('renders departure and arrival IATA codes', () => {
    render(
      <RouteSection compact={false} isLoading={false} depIata="FRA" arrIata="JFK" />,
    );
    expect(screen.getByText('FRA')).toBeInTheDocument();
    expect(screen.getByText('JFK')).toBeInTheDocument();
  });

  it('renders a flag for each known country code', () => {
    const { container } = render(
      <RouteSection
        compact={false}
        isLoading={false}
        depIata="FRA"
        depCode="DE"
        arrIata="JFK"
        arrCode="US"
      />,
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute('src')).toBe('/flags/de.svg');
    expect(imgs[1].getAttribute('src')).toBe('/flags/us.svg');
  });

  it('omits flags when country codes are unknown', () => {
    const { container } = render(
      <RouteSection compact={false} isLoading={false} depIata="FRA" arrIata="JFK" />,
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('falls back to placeholders when IATA codes are missing', () => {
    render(<RouteSection compact={false} isLoading={false} />);
    expect(screen.getAllByText('---')).toHaveLength(2);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <RouteSection
        compact={false}
        isLoading={false}
        depIata="FRA"
        depCode="DE"
        arrIata="JFK"
        arrCode="US"
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
