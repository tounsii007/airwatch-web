// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { StatCard } from './StatCard';

describe('<StatCard /> (admin shared/ui)', () => {
  it('renders the label and a numeric value', () => {
    render(<StatCard label="Latency" value={42} />);
    expect(screen.getByText('Latency')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('passes a string value through verbatim', () => {
    render(<StatCard label="State" value="N/A" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders the unit alongside the value', () => {
    render(<StatCard label="Latency" value={42} unit="ms" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('ms')).toBeInTheDocument();
  });

  it('renders the hint when provided', () => {
    render(<StatCard label="Latency" value={42} hint="p95 over 5m" />);
    expect(screen.getByText('p95 over 5m')).toBeInTheDocument();
  });

  it('applies the tone class to the value', () => {
    render(<StatCard label="Errors" value={3} tone="danger" />);
    expect(screen.getByText('3')).toHaveClass('text-error');
  });

  it('decorates a positive delta with an up arrow + success tone', () => {
    render(<StatCard label="Throughput" value={100} delta={12} />);
    const chip = screen.getByText(/▲/);
    expect(chip).toHaveClass('text-success');
    expect(chip).toHaveTextContent('12');
  });

  it('decorates a negative delta with a down arrow + danger tone (absolute value)', () => {
    render(<StatCard label="Throughput" value={100} delta={-5} />);
    const chip = screen.getByText(/▼/);
    expect(chip).toHaveClass('text-error');
    expect(chip).toHaveTextContent('5');
  });

  it('uses a neutral diamond for a zero delta', () => {
    render(<StatCard label="Throughput" value={100} delta={0} />);
    expect(screen.getByText(/◆/)).toBeInTheDocument();
  });

  it('overrides the delta unit when deltaUnit is given', () => {
    render(<StatCard label="Cache" value={90} unit="ms" delta={3} deltaUnit="%" />);
    expect(screen.getByText(/▲/)).toHaveTextContent('3%');
  });

  it('renders no delta chip when delta is undefined', () => {
    render(<StatCard label="Throughput" value={100} />);
    expect(screen.queryByText(/[▲▼◆]/)).toBeNull();
  });

  it('renders a sparkline only when it has more than one point', () => {
    const { container, rerender } = render(
      <StatCard label="Trend" value={1} sparkline={[1, 2, 3, 4]} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();

    rerender(<StatCard label="Trend" value={1} sparkline={[5]} />);
    expect(container.querySelector('svg')).toBeNull();

    rerender(<StatCard label="Trend" value={1} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <StatCard
        label="Requests"
        value={1234}
        unit="rps"
        hint="rolling 1m"
        tone="info"
        delta={8}
        sparkline={[3, 5, 4, 9, 12]}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
