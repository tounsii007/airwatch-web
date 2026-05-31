// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { AirlineLogo } from './AirlineLogo';

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

describe('<AirlineLogo />', () => {
  it('renders the plane fallback when no IATA is supplied', () => {
    const { container } = render(<AirlineLogo airlineIata={undefined} size="sm" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('builds the logo src from the upper-cased IATA code', () => {
    const { container } = render(<AirlineLogo airlineIata="lh" size="sm" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://pics.avs.io/200/80/LH.png',
    );
  });

  it('renders a decorative logo with an empty alt', () => {
    const { container } = render(<AirlineLogo airlineIata="BA" size="sm" />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('uses the large wrapper sizing for size="lg"', () => {
    const { container } = render(<AirlineLogo airlineIata="BA" size="lg" />);
    expect(container.firstChild).toHaveClass('w-24');
  });

  it('uses the small wrapper sizing for size="sm"', () => {
    const { container } = render(<AirlineLogo airlineIata="BA" size="sm" />);
    expect(container.firstChild).toHaveClass('w-14');
  });

  it('has no axe violations with a logo', async () => {
    const { container } = render(<AirlineLogo airlineIata="LH" size="lg" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no axe violations in the fallback state', async () => {
    const { container } = render(<AirlineLogo airlineIata={undefined} size="sm" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
