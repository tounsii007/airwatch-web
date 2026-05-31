// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { LineChart, type Series } from './LineChart';

const series = (
  id: string,
  color: string,
  points: Array<[number, number | null]>,
): Series => ({
  id,
  label: id,
  color,
  points: points.map(([t, v]) => ({ t, v })),
});

function textContents(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
}

describe('<LineChart />', () => {
  it('shows the awaiting-data state when there are no numeric values', () => {
    render(<LineChart series={[series('a', 'var(--info)', [])]} />);
    expect(screen.getByText('Awaiting data…')).toBeInTheDocument();
  });

  it('treats an all-null series as empty', () => {
    render(
      <LineChart
        series={[series('a', 'var(--info)', [[1, null], [2, null]])]}
      />,
    );
    expect(screen.getByText('Awaiting data…')).toBeInTheDocument();
  });

  it('exposes the chart as an img with a default aria-label', () => {
    const { container } = render(
      <LineChart series={[series('a', 'var(--info)', [[1, 1], [2, 2], [3, 3]])]} />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Time series chart');
  });

  it('uses yLabel as the accessible name when given', () => {
    const { container } = render(
      <LineChart
        series={[series('a', 'var(--info)', [[1, 1], [2, 2]])]}
        yLabel="CPU %"
      />,
    );
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toBe('CPU %');
  });

  it('renders a legend entry per series', () => {
    render(
      <LineChart
        series={[
          series('api-1', 'var(--info)', [[1, 1], [2, 2]]),
          series('api-2', 'var(--primary)', [[1, 3], [2, 4]]),
        ]}
      />,
    );
    expect(screen.getByText('api-1')).toBeInTheDocument();
    expect(screen.getByText('api-2')).toBeInTheDocument();
  });

  it('draws five horizontal gridlines', () => {
    const { container } = render(
      <LineChart series={[series('a', 'var(--info)', [[1, 1], [2, 2], [3, 3]])]} />,
    );
    // No gaps → the only <line> elements are the five gridlines.
    expect(container.querySelectorAll('line')).toHaveLength(5);
  });

  it('rounds the y-axis max up to a nice value', () => {
    // rawMax 8 → niceMax → 10, so the top tick label reads "10".
    const { container } = render(
      <LineChart series={[series('a', 'var(--info)', [[1, 2], [2, 8]])]} />,
    );
    expect(textContents(container)).toContain('10');
  });

  it('appends yUnit to the axis labels', () => {
    const { container } = render(
      <LineChart
        series={[series('a', 'var(--info)', [[1, 1], [2, 2]])]}
        yUnit=" ms"
      />,
    );
    expect(textContents(container).some((l) => l.endsWith(' ms'))).toBe(true);
  });

  it('formats x-axis ticks via xFormat', () => {
    render(
      <LineChart
        series={[series('a', 'var(--info)', [[1000, 1], [3000, 2]])]}
        xFormat={(t) => `T${t}`}
      />,
    );
    expect(screen.getByText('T1000')).toBeInTheDocument();
    expect(screen.getByText('T3000')).toBeInTheDocument();
  });

  it('splits a series across a large time gap into separate paths', () => {
    // Cadence of 1, then a jump of 98 (> 3× median) → one hole, two runs.
    const pts: Array<[number, number]> = [
      [0, 5],
      [1, 5],
      [2, 5],
      [100, 5],
      [101, 5],
      [102, 5],
    ];
    const { container } = render(
      <LineChart series={[series('a', 'var(--info)', pts)]} />,
    );
    expect(container.querySelectorAll('path')).toHaveLength(2);
    // A dashed bridge line marks the hole.
    const dashed = Array.from(container.querySelectorAll('line')).filter(
      (l) => l.getAttribute('stroke-dasharray') === '3 4',
    );
    expect(dashed).toHaveLength(1);
  });

  it('marks an isolated single sample with a circle instead of a path', () => {
    const { container } = render(
      <LineChart series={[series('a', 'var(--info)', [[1, 5]])]} />,
    );
    expect(container.querySelectorAll('path')).toHaveLength(0);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <LineChart
        series={[series('a', 'var(--info)', [[1, 1], [2, 2], [3, 3]])]}
        yLabel="CPU %"
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
