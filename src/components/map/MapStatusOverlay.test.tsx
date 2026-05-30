// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AppLanguage } from '@/lib/types';
import { MapStatusOverlay } from './MapStatusOverlay';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

const EN = 'en' as AppLanguage;

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

describe('<MapStatusOverlay />', () => {
  it('is a polite status region showing the flight count and label', () => {
    render(
      <MapStatusOverlay count={7} isLoading={false} hasError={false} language={EN} />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('flights_upper')).toBeInTheDocument();
  });

  it('shows a pulsing amber dot while loading', () => {
    const { container } = render(
      <MapStatusOverlay count={0} isLoading hasError={false} language={EN} />,
    );
    expect(container.querySelector('.animate-pulse-glow')).not.toBeNull();
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(1);
  });

  it('shows a non-pulsing dot on error', () => {
    const { container } = render(
      <MapStatusOverlay count={3} isLoading={false} hasError language={EN} />,
    );
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(1);
    expect(container.querySelector('.animate-pulse-glow')).toBeNull();
  });

  it('renders no health dot when idle and healthy', () => {
    const { container } = render(
      <MapStatusOverlay count={5} isLoading={false} hasError={false} language={EN} />,
    );
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <MapStatusOverlay count={12} isLoading={false} hasError={false} language={EN} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
