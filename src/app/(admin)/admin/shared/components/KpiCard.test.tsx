// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { KpiCard } from './KpiCard';

// KpiCard embeds <CountUp>, which probes prefers-reduced-motion. happy-dom
// may not ship matchMedia, so provide a stable stub (reduced = false).
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList);
});

describe('<KpiCard />', () => {
  it('renders the label, value, and unit', () => {
    render(<KpiCard label="UPTIME" value={99} unit="%" />);
    expect(screen.getByText('UPTIME')).toBeInTheDocument();
    // CountUp seeds its display with the target value, so it's there on first paint.
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('formats the value to the requested decimals', () => {
    render(<KpiCard label="P95" value={42.5} decimals={1} unit="ms" />);
    // CountUp formats via Intl in the runtime locale (the CI/dev box may be
    // de-DE → "42,5"), so derive the expected string the same way rather
    // than hard-coding a decimal separator. The point under test is that
    // decimals=1 yields exactly one fractional digit.
    const oneDp = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(42.5);
    expect(screen.getByText(oneDp)).toBeInTheDocument();
  });

  it('tints the big number according to tone', () => {
    render(<KpiCard label="ERRORS" value={3} tone="error" />);
    const numberBox = screen.getByText('3').closest('div');
    expect(numberBox?.style.color).toBe('var(--error)');
  });

  it('defaults to the primary accent tone', () => {
    render(<KpiCard label="X" value={1} />);
    expect(screen.getByText('1').closest('div')?.style.color).toBe(
      'var(--primary-bright)',
    );
  });

  it('renders a hint line when given', () => {
    render(<KpiCard label="HOSTS" value={9} hint="of 11 monitored" />);
    expect(screen.getByText('of 11 monitored')).toBeInTheDocument();
  });

  it('renders a delta chip coloured by deltaTone', () => {
    render(
      <KpiCard
        label="SIGNUPS"
        value={120}
        delta="+12 in 24h"
        deltaTone="success"
      />,
    );
    const chip = screen.getByText('+12 in 24h');
    expect(chip.style.color).toBe('var(--success)');
  });

  it('colours the delta with the default tone when deltaTone is omitted', () => {
    render(<KpiCard label="X" value={1} delta="+1" />);
    expect(screen.getByText('+1').style.color).toBe('var(--primary-bright)');
  });

  it('omits the sparkline for fewer than two points', () => {
    const { container, rerender } = render(
      <KpiCard label="X" value={1} />,
    );
    expect(container.querySelector('svg')).toBeNull();

    rerender(<KpiCard label="X" value={1} sparkline={[5]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders a sparkline for two or more points', () => {
    const { container } = render(
      <KpiCard label="X" value={1} sparkline={[1, 4, 2, 8, 5]} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <KpiCard
        label="UPTIME"
        value={99}
        unit="%"
        tone="success"
        hint="last 24h"
        delta="+0.2"
        deltaTone="success"
        sparkline={[98, 99, 99, 100, 99]}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
