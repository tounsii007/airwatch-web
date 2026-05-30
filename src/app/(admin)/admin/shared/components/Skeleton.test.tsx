// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonKpiCard,
} from './Skeleton';

describe('Skeleton primitives', () => {
  it('renders a decorative, aria-hidden shimmer span by default', () => {
    const { container } = render(<Skeleton />);
    const span = container.querySelector('.admin-skeleton') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span).toHaveAttribute('aria-hidden', 'true');
    expect(span.style.width).toBe('100%');
    expect(span.style.height).toBe('1em');
  });

  it('forwards width, height, and radius props', () => {
    const { container } = render(
      <Skeleton width={80} height={32} radius={8} />,
    );
    const span = container.querySelector('.admin-skeleton') as HTMLElement;
    expect(span.style.width).toBe('80px');
    expect(span.style.height).toBe('32px');
    expect(span.style.borderRadius).toBe('8px');
  });

  it('merges caller style overrides on top of the base styles', () => {
    const { container } = render(
      <Skeleton style={{ marginBottom: '1rem' }} />,
    );
    const span = container.querySelector('.admin-skeleton') as HTMLElement;
    expect(span.style.marginBottom).toBe('1rem');
    // Base shimmer styling survives the override merge.
    expect(span.style.backgroundSize).toBe('200% 100%');
  });

  it('SkeletonKpiCard stacks three shimmer bars', () => {
    const { container } = render(<SkeletonKpiCard />);
    expect(container.querySelectorAll('.admin-skeleton')).toHaveLength(3);
  });

  it('SkeletonCard renders a header plus three bars per row', () => {
    const { container } = render(<SkeletonCard rows={4} />);
    // 1 header + 4 rows × 3 columns = 13.
    expect(container.querySelectorAll('.admin-skeleton')).toHaveLength(13);
  });

  it('SkeletonCard defaults to five rows', () => {
    const { container } = render(<SkeletonCard />);
    // 1 header + 5 × 3 = 16.
    expect(container.querySelectorAll('.admin-skeleton')).toHaveLength(16);
  });

  it('SkeletonChart renders a title bar and a body sized to height', () => {
    const { container } = render(<SkeletonChart height={240} />);
    const bars = container.querySelectorAll<HTMLElement>('.admin-skeleton');
    expect(bars).toHaveLength(2);
    expect(bars[1].style.height).toBe('240px');
  });

  it('has no axe violations (decorative placeholders)', async () => {
    const { container } = render(<SkeletonCard rows={2} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
