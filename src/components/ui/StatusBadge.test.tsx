// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('<StatusBadge />', () => {
  it('renders nothing when status is undefined', () => {
    const { container } = render(<StatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('maps known statuses to friendly labels', () => {
    render(<StatusBadge status="en-route" />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('uppercases and shows the raw status for unknown values', () => {
    render(<StatusBadge status="diverted" />);
    expect(screen.getByText('DIVERTED')).toBeInTheDocument();
  });

  it.each([
    ['active', 'LIVE'],
    ['landed', 'LANDED'],
    ['scheduled', 'SCHED'],
    ['cancelled', 'CANCEL'],
  ])('translates %s → %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('accepts case-insensitive input', () => {
    render(<StatusBadge status="LANDED" />);
    expect(screen.getByText('LANDED')).toBeInTheDocument();
  });
});
