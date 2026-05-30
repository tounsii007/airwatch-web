// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Sparkline } from './Sparkline';

describe('<Sparkline /> (admin charts)', () => {
  it('renders an empty, path-less svg for no values', () => {
    const { container } = render(<Sparkline values={[]} />);
    const svg = container.querySelector('svg')!;
    expect(svg).not.toBeNull();
    expect(svg.querySelectorAll('path')).toHaveLength(0);
    expect(svg).toHaveAttribute('aria-hidden');
  });

  it('draws an area fill plus a line path for a multi-point series', () => {
    const { container } = render(<Sparkline values={[1, 4, 2, 8, 5]} />);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('survives a flat series without producing NaN coordinates', () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} />);
    const linePath = container.querySelectorAll('path')[1];
    expect(linePath.getAttribute('d')).not.toMatch(/NaN/);
  });

  it('applies a custom stroke colour to the line', () => {
    const { container } = render(
      <Sparkline values={[1, 2, 3]} stroke="var(--success)" />,
    );
    expect(container.querySelectorAll('path')[1].getAttribute('stroke')).toBe(
      'var(--success)',
    );
  });

  it('omits the last-point marker by default and renders it on demand', () => {
    const { container, rerender } = render(<Sparkline values={[1, 2, 3]} />);
    expect(container.querySelector('circle')).toBeNull();
    rerender(<Sparkline values={[1, 2, 3]} showLastPoint />);
    expect(container.querySelector('circle')).not.toBeNull();
  });

  it('uses the requested viewBox dimensions', () => {
    const { container } = render(
      <Sparkline values={[1, 2]} width={200} height={50} />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 50');
    expect(svg.getAttribute('height')).toBe('50');
  });

  it('renders a single-point series without throwing', () => {
    const { container } = render(<Sparkline values={[7]} />);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Sparkline values={[3, 1, 4, 1, 5]} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
