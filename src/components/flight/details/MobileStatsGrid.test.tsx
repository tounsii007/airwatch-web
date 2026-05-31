// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ComponentProps } from 'react';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import { formatHeading } from '@/components/flight/details/flightDisplayUtils';
import { MobileStatsGrid } from './MobileStatsGrid';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

function renderGrid(overrides: Partial<ComponentProps<typeof MobileStatsGrid>> = {}) {
  const props: ComponentProps<typeof MobileStatsGrid> = {
    language: 'en',
    altitudeUnit: 'feet',
    speedUnit: 'knots',
    baroAltitude: 10668,
    velocity: 250,
    trueTrack: 270,
    showMore: false,
    onToggleMore: vi.fn(),
    ...overrides,
  };
  return render(<MobileStatsGrid {...props} />);
}

describe('<MobileStatsGrid />', () => {
  it('renders the alt / spd / hdg cells', () => {
    renderGrid();
    expect(screen.getByText('alt_label')).toBeInTheDocument();
    expect(screen.getByText(formatAltitude(10668, 'feet'))).toBeInTheDocument();
    expect(screen.getByText(formatSpeed(250, 'knots'))).toBeInTheDocument();
    expect(screen.getByText(formatHeading(270))).toBeInTheDocument();
  });

  it('shows the "more" affordance when collapsed', () => {
    renderGrid({ showMore: false });
    expect(screen.getByText('more_label')).toBeInTheDocument();
    expect(screen.queryByText('less_label')).toBeNull();
  });

  it('shows the "less" affordance when expanded', () => {
    renderGrid({ showMore: true });
    expect(screen.getByText('less_label')).toBeInTheDocument();
  });

  it('invokes onToggleMore when the toggle is pressed', () => {
    const onToggleMore = vi.fn();
    renderGrid({ onToggleMore });
    fireEvent.click(screen.getByRole('button'));
    expect(onToggleMore).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = renderGrid();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
