// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { AircraftPhoto } from './AircraftPhoto';

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

describe('<AircraftPhoto />', () => {
  it('renders the photo with the supplied src', () => {
    const { container } = render(<AircraftPhoto photoUrl="/jet.jpg" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/jet.jpg');
  });

  it('shows the photo credit', () => {
    render(<AircraftPhoto photoUrl="/jet.jpg" />);
    expect(screen.getByText('planespotters.net')).toBeInTheDocument();
  });

  it('shows the registration overlay when provided', () => {
    render(<AircraftPhoto photoUrl="/jet.jpg" registration="D-ABCD" />);
    expect(screen.getByText('D-ABCD')).toBeInTheDocument();
  });

  it('omits the registration overlay when not provided', () => {
    render(<AircraftPhoto photoUrl="/jet.jpg" />);
    expect(screen.queryByText('D-ABCD')).toBeNull();
  });

  it('is a disabled, non-interactive button without onExpand', () => {
    const { container } = render(<AircraftPhoto photoUrl="/jet.jpg" />);
    expect(screen.getByRole('button')).toBeDisabled();
    // The expand hint (Maximize2 svg) only renders in the interactive state.
    expect(container.querySelector('svg')).toBeNull();
  });

  it('fires onExpand and shows the expand hint when interactive', () => {
    const onExpand = vi.fn();
    const { container } = render(
      <AircraftPhoto photoUrl="/jet.jpg" onExpand={onExpand} />,
    );
    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
    expect(container.querySelector('svg')).toBeInTheDocument();
    fireEvent.click(button);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <AircraftPhoto photoUrl="/jet.jpg" registration="D-ABCD" onExpand={vi.fn()} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
