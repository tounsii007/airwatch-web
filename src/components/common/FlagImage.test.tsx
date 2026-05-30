// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ReactEventHandler } from 'react';
import { FlagImage } from './FlagImage';

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

describe('<FlagImage />', () => {
  it('builds the flag src from the lowercased country code', () => {
    const { container } = render(<FlagImage code="DE" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/flags/de.svg',
    );
  });

  it('defaults to 20×16 dimensions', () => {
    const { container } = render(<FlagImage code="fr" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('width')).toBe('20');
    expect(img.getAttribute('height')).toBe('16');
  });

  it('passes a custom className through', () => {
    const { container } = render(<FlagImage code="us" className="rounded" />);
    expect(container.querySelector('img')).toHaveClass('rounded');
  });

  it('is decorative with an empty alt', () => {
    const { container } = render(<FlagImage code="de" />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('has no axe violations', async () => {
    const { container } = render(<FlagImage code="de" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
