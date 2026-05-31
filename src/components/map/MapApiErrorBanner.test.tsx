// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AppLanguage } from '@/lib/types';
import { MapApiErrorBanner } from './MapApiErrorBanner';

// Resolve translation keys to themselves so we can assert which copy
// branch the error code selected without coupling to real i18n strings.
vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

const EN = 'en' as AppLanguage;

describe('<MapApiErrorBanner />', () => {
  it('renders nothing when there is no error', () => {
    const { container } = render(<MapApiErrorBanner error={null} language={EN} />);
    expect(container.firstChild).toBeNull();
  });

  it('exposes an assertive alert when an error is present', () => {
    render(<MapApiErrorBanner error="rate_limited" language={EN} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('maps a month-limit error to the quota copy', () => {
    render(<MapApiErrorBanner error="month_limit_exceeded" language={EN} />);
    expect(screen.getByText('api_limit_reached')).toBeInTheDocument();
    expect(screen.getByText('api_limit_hint')).toBeInTheDocument();
  });

  it('maps a network error to the network copy', () => {
    render(<MapApiErrorBanner error="network_error" language={EN} />);
    expect(screen.getByText('api_network_error')).toBeInTheDocument();
  });

  it('maps a proxy error to the proxy copy', () => {
    render(<MapApiErrorBanner error="proxy_unreachable" language={EN} />);
    expect(screen.getByText('api_proxy_error')).toBeInTheDocument();
  });

  it('maps a rate-limit error to the rate copy', () => {
    render(<MapApiErrorBanner error="rate_limited" language={EN} />);
    expect(screen.getByText('api_rate_limited')).toBeInTheDocument();
  });

  it('falls back to the generic copy for an unknown code', () => {
    render(<MapApiErrorBanner error="something_weird" language={EN} />);
    expect(screen.getByText('api_error')).toBeInTheDocument();
    expect(screen.getByText('api_error_hint')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <MapApiErrorBanner error="rate_limited" language={EN} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
