// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { CountUp } from './CountUp';

/** CountUp consults `prefers-reduced-motion`; happy-dom ships no matchMedia. */
function setReducedMotion(reduced: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: reduced,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
}

/** Locale-derived expectation — the CI box is de-DE, so the decimal
 *  separator is a comma. Never hard-code it. */
function fmt(value: number, decimals = 0, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

describe('<CountUp />', () => {
  beforeEach(() => setReducedMotion(false));
  afterEach(() => vi.restoreAllMocks());

  it('shows the value on the first paint without waiting for the tween', () => {
    render(<CountUp value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('formats to the requested number of decimals', () => {
    render(<CountUp value={42.5} decimals={1} />);
    expect(screen.getByText(fmt(42.5, 1))).toBeInTheDocument();
  });

  it('groups thousands using the active locale', () => {
    render(<CountUp value={1234567} />);
    expect(screen.getByText(fmt(1234567))).toBeInTheDocument();
  });

  it('honours an explicit locale override', () => {
    render(<CountUp value={1234.5} decimals={1} locale="en-US" />);
    expect(screen.getByText('1,234.5')).toBeInTheDocument();
  });

  it('keeps the tabular base class and appends a caller className', () => {
    render(<CountUp value={1} className="extra" />);
    expect(screen.getByText('1')).toHaveClass('tabular', 'extra');
  });

  it('snaps straight to the new value under reduced motion', async () => {
    setReducedMotion(true);
    const { rerender } = render(<CountUp value={10} />);
    expect(screen.getByText('10')).toBeInTheDocument();

    rerender(<CountUp value={20} />);
    await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument());
  });

  it('animates toward the latest value over time', async () => {
    const { rerender } = render(<CountUp value={5} duration={20} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    rerender(<CountUp value={9} duration={20} />);
    await waitFor(() => expect(screen.getByText('9')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('renders a non-finite value without crashing', () => {
    render(<CountUp value={Number.NaN} />);
    expect(screen.getByText('NaN')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<CountUp value={1234} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
