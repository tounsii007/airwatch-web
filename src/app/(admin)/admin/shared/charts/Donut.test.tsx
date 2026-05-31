// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Donut } from './Donut';

// The component fixes r=50, so the arc circumference is constant.
const C = 2 * Math.PI * 50;

/** The value arc is the second <circle> ([0] is the background track). */
function arc(container: HTMLElement): SVGCircleElement {
  return container.querySelectorAll('circle')[1] as unknown as SVGCircleElement;
}
function offset(container: HTMLElement): number {
  return Number(arc(container).getAttribute('stroke-dashoffset'));
}

describe('<Donut />', () => {
  it('draws a full ring (offset 0) when value equals total', () => {
    const { container } = render(<Donut value={10} total={10} />);
    expect(offset(container)).toBeCloseTo(0, 4);
  });

  it('draws an empty ring (offset = circumference) at zero', () => {
    const { container } = render(<Donut value={0} total={10} />);
    expect(offset(container)).toBeCloseTo(C, 4);
  });

  it('offsets the arc proportionally for a partial value', () => {
    const { container } = render(<Donut value={5} total={10} />);
    expect(offset(container)).toBeCloseTo(C * 0.5, 4);
  });

  it('clamps an over-full value to a complete ring', () => {
    const { container } = render(<Donut value={15} total={10} />);
    expect(offset(container)).toBeCloseTo(0, 4);
  });

  it('clamps a negative value to an empty ring', () => {
    const { container } = render(<Donut value={-4} total={10} />);
    expect(offset(container)).toBeCloseTo(C, 4);
  });

  it('guards a zero total against NaN', () => {
    const { container } = render(<Donut value={0} total={0} />);
    const o = offset(container);
    expect(Number.isFinite(o)).toBe(true);
    expect(o).toBeCloseTo(C, 4);
  });

  it('sets the dash array to the full circumference', () => {
    const { container } = render(<Donut value={3} total={10} />);
    expect(Number(arc(container).getAttribute('stroke-dasharray'))).toBeCloseTo(C, 4);
  });

  it('renders the center children', () => {
    render(
      <Donut value={9} total={11}>
        <span>9/11</span>
      </Donut>,
    );
    expect(screen.getByText('9/11')).toBeInTheDocument();
  });

  it('applies the diameter to the svg', () => {
    const { container } = render(<Donut value={1} total={2} size={200} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('height')).toBe('200');
  });

  it('applies custom arc and track colours', () => {
    const { container } = render(
      <Donut value={1} total={2} color="var(--error)" trackColor="var(--border)" />,
    );
    const circles = container.querySelectorAll('circle');
    expect(circles[0].getAttribute('stroke')).toBe('var(--border)');
    expect(circles[1].getAttribute('stroke')).toBe('var(--error)');
  });

  it('derives stroke width from thickness', () => {
    const { container } = render(<Donut value={1} total={2} thickness={0.1} />);
    // 50 * 0.1 * 2 = 10
    expect(Number(arc(container).getAttribute('stroke-width'))).toBeCloseTo(10, 4);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <Donut value={9} total={11}>
        <span>9</span>
      </Donut>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
