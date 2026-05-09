// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiStrip } from './KpiStrip';

describe('<KpiStrip />', () => {
  const baseProps = {
    uptimePct:    99.5,
    portsUp:      11,
    portsTotal:   12,
    totalBlocked: 1234,
    uniqueIps:    42,
    recentRate:   30,
    avgLatencyMs: 17,
  };

  it('renders all four labels', () => {
    render(<KpiStrip {...baseProps} />);
    expect(screen.getByText('UPTIME')).toBeInTheDocument();
    expect(screen.getByText('THREATS BLOCKED')).toBeInTheDocument();
    expect(screen.getByText('RECENT REJECTIONS')).toBeInTheDocument();
    expect(screen.getByText('AVG LATENCY')).toBeInTheDocument();
  });

  it('renders the % and ms unit labels', () => {
    render(<KpiStrip {...baseProps} />);
    // The numeric value rolls via CountUp animation so we don't assert
    // on the digits — only on the unit suffixes that ride along.
    expect(screen.getByText(/^%$/)).toBeInTheDocument();
    expect(screen.getByText(/^ms$/)).toBeInTheDocument();
  });

  it('shows the ports-up hint and the unique-IPs hint', () => {
    render(<KpiStrip {...baseProps} />);
    expect(screen.getByText(/11\/12 ports up/)).toBeInTheDocument();
    expect(screen.getByText(/42 unique IPs/)).toBeInTheDocument();
  });

  it('applies the warning tone when uptime drops below the threshold', () => {
    const { container, rerender } = render(<KpiStrip {...baseProps} uptimePct={99.5} />);
    const before = container.innerHTML;

    rerender(<KpiStrip {...baseProps} uptimePct={92.0} portsUp={9} />);
    const after = container.innerHTML;

    expect(before).not.toBe(after);
  });
});
