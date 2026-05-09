// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortGrid } from './PortGrid';
import type { PortRowWithHistory } from '@/app/(admin)/admin/dashboard/types';

vi.mock('@/app/(admin)/ClientTime', () => ({
  ClientTime: ({ iso }: { iso: string }) => <span data-testid="ts">{iso}</span>,
}));

vi.mock('@/app/(admin)/admin/shared/charts/Sparkline', () => ({
  Sparkline: ({ values }: { values: number[] }) => (
    <svg role="img" aria-label="sparkline" data-points={values.length} />
  ),
}));

const samplePort: PortRowWithHistory = {
  port_name:    'api',
  host:         'api',
  port_number:  18080,
  up:           true,
  latency_ms:   12,
  error_msg:    null,
  probed_at:    '2026-05-09T12:00:00Z',
  history:      [10, 12, 13, 11, 12],
  historyPoints: [
    { t: 1, v: 10, up: true },
    { t: 2, v: 12, up: true },
    { t: 3, v: 13, up: true },
    { t: 4, v: 11, up: true },
    { t: 5, v: 12, up: true },
  ],
};

const downPort: PortRowWithHistory = {
  port_name: 'postgres', host: 'postgres', port_number: 55432,
  up: false, latency_ms: null, error_msg: 'timeout',
  probed_at: '2026-05-09T12:00:00Z',
  history: [], historyPoints: [],
};

describe('<PortGrid />', () => {
  it('renders one tile per port with name + host:port + status pill', () => {
    render(<PortGrid ports={[samplePort, downPort]} />);
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText('postgres')).toBeInTheDocument();
    expect(screen.getByText('api:18080')).toBeInTheDocument();
    expect(screen.getByText('postgres:55432')).toBeInTheDocument();
    expect(screen.getByText('UP')).toBeInTheDocument();
    expect(screen.getByText('DOWN')).toBeInTheDocument();
  });

  it('shows latency with ms suffix when up; em-dash when latency is null', () => {
    render(<PortGrid ports={[samplePort, downPort]} />);
    expect(screen.getByText('12 ms')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the empty-state when no ports were probed yet', () => {
    render(<PortGrid ports={[]} />);
    expect(screen.getByText(/no probes yet/i)).toBeInTheDocument();
  });

  it('passes the history values to the Sparkline', () => {
    const { container } = render(<PortGrid ports={[samplePort]} />);
    const sparkline = container.querySelector('svg[aria-label="sparkline"]');
    expect(sparkline?.getAttribute('data-points')).toBe('5');
  });
});
