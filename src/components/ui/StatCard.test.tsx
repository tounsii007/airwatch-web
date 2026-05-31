// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { StatCard } from './StatCard';

// StatCard reads the active language from the settings store to label its
// trend glyph for screen readers. Pin it so the component never has to touch
// the real zustand/localStorage-backed store.
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

/** U+2212 — the typographic minus the DeltaPill uses for negative deltas. */
const MINUS = '−';

beforeEach(() => {
  // The embedded CountUp consults prefers-reduced-motion on mount.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
});

describe('<StatCard />', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Flights" value={42} />);
    expect(screen.getByText('Flights')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows a skeleton placeholder while the value is undefined', () => {
    const { container } = render(<StatCard label="Flights" value={undefined} />);
    expect(container.querySelector('.skeleton')).not.toBeNull();
    expect(container.querySelector('.stat-card-value-number')).toBeNull();
  });

  it('mutes a zero value', () => {
    render(<StatCard label="Flights" value={0} />);
    const num = screen.getByText('0').closest('.stat-card-value-number') as HTMLElement;
    expect(num.style.color).toBe('var(--text-muted)');
    expect(num.style.opacity).toBe('0.55');
  });

  it('tints a non-zero value with the status colour', () => {
    render(<StatCard label="Flights" value={42} status="success" />);
    const num = screen.getByText('42').closest('.stat-card-value-number') as HTMLElement;
    expect(num.style.color).toBe('var(--success)');
    expect(num.style.opacity).toBe('1');
  });

  it('appends a unit beside the value', () => {
    render(<StatCard label="Latency" value={42} unit="ms" />);
    expect(screen.getByText('ms')).toBeInTheDocument();
  });

  it('renders a hint line', () => {
    render(<StatCard label="Flights" value={42} hint="per minute" />);
    expect(screen.getByText('per minute')).toBeInTheDocument();
  });

  it('renders an icon in the halo slot', () => {
    render(
      <StatCard label="Flights" value={42} icon={<svg data-testid="ico" />} />,
    );
    expect(screen.getByTestId('ico')).toBeInTheDocument();
  });

  it('shows an up-trend glyph', () => {
    render(<StatCard label="Flights" value={42} trend="up" />);
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('shows a down-trend glyph', () => {
    render(<StatCard label="Flights" value={42} trend="down" />);
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('renders a positive delta pill', () => {
    render(<StatCard label="Flights" value={42} delta={12.3} />);
    expect(screen.getByText('+12.3%')).toBeInTheDocument();
  });

  it('renders a negative delta pill with a typographic minus', () => {
    render(<StatCard label="Flights" value={42} delta={-4} />);
    expect(screen.getByText(`${MINUS}4.0%`)).toBeInTheDocument();
  });

  it('renders a flat delta pill', () => {
    render(<StatCard label="Flights" value={42} delta={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('omits the delta pill while loading', () => {
    render(<StatCard label="Flights" value={undefined} delta={5} />);
    expect(screen.queryByText('+5.0%')).toBeNull();
  });

  it('renders a sparkline for two or more trend points', () => {
    const { container } = render(
      <StatCard label="Flights" value={42} trendData={[1, 4, 2, 8]} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('omits the sparkline for fewer than two trend points', () => {
    const { container } = render(
      <StatCard label="Flights" value={42} trendData={[1]} />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('applies the holographic sheen class only when requested', () => {
    const { container, rerender } = render(
      <StatCard label="Flights" value={42} />,
    );
    expect(container.querySelector('.stat-card')).not.toHaveClass(
      'glass-panel-holographic',
    );

    rerender(<StatCard label="Flights" value={42} holographic />);
    expect(container.querySelector('.stat-card')).toHaveClass(
      'glass-panel-holographic',
    );
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <StatCard
        label="Flights"
        value={1280}
        unit="req/s"
        status="success"
        hint="last 24h"
        trendData={[3, 1, 4, 1, 5, 9]}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
