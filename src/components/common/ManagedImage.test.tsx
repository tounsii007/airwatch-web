// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { ManagedImage } from './ManagedImage';

// next/image does heavy optimisation work that is meaningless under
// happy-dom; swap it for a plain <img> that still forwards onError so the
// fallback-swap behaviour stays exercisable.
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

describe('<ManagedImage />', () => {
  it('renders the underlying image with src and alt', () => {
    render(<ManagedImage src="/avatar.png" alt="Avatar" width={32} height={32} />);
    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveAttribute(
      'src',
      '/avatar.png',
    );
  });

  it('swaps in the fallback after the image errors', () => {
    render(
      <ManagedImage
        src="/avatar.png"
        alt="Avatar"
        width={32}
        height={32}
        fallback={<span>broken</span>}
      />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'Avatar' }));
    expect(screen.getByText('broken')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('forwards the error event to the caller onError', () => {
    const onError = vi.fn();
    render(
      <ManagedImage src="/x.png" alt="X" width={8} height={8} onError={onError} />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'X' }));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when it errors and no fallback is supplied', () => {
    const { container } = render(
      <ManagedImage src="/x.png" alt="X" width={8} height={8} />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'X' }));
    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ManagedImage src="/avatar.png" alt="Avatar" width={32} height={32} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
