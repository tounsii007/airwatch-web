// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { LogoImage } from './LogoImage';

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

describe('<LogoImage />', () => {
  it('forwards src and alt to the managed image', () => {
    render(<LogoImage src="/logo.png" alt="Acme" />);
    expect(screen.getByRole('img', { name: 'Acme' })).toHaveAttribute(
      'src',
      '/logo.png',
    );
  });

  it('renders the fallback when the logo fails to load', () => {
    render(
      <LogoImage src="/logo.png" alt="Acme" fallback={<span>no logo</span>} />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'Acme' }));
    expect(screen.getByText('no logo')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<LogoImage src="/logo.png" alt="Acme" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
