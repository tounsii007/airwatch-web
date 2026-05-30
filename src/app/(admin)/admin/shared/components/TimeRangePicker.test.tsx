// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { RANGES, TimeRangePicker } from './TimeRangePicker';

describe('TimeRangePicker', () => {
  it('exposes seven preset ranges with the documented minute mappings', () => {
    expect(RANGES.map((r) => r.key)).toEqual([
      '1h',
      '6h',
      '24h',
      '1w',
      '1m',
      '6m',
      '1y',
    ]);
    expect(RANGES.find((r) => r.key === '24h')?.minutes).toBe(1440);
    expect(RANGES.find((r) => r.key === '1y')?.minutes).toBe(525_600);
  });

  it('renders a button per range using the short labels', () => {
    render(<TimeRangePicker value="24h" onChange={vi.fn()} />);
    for (const label of ['1H', '6H', '24H', '1W', '1M', '6M', '1Y']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the selected range as aria-pressed and the rest not', () => {
    render(<TimeRangePicker value="6h" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '6H' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '1H' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('calls onChange with the key of a clicked range', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeRangePicker value="24h" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '1W' }));
    expect(onChange).toHaveBeenCalledWith('1w');
  });

  it('highlights the active range and leaves the others transparent', () => {
    render(<TimeRangePicker value="1m" onChange={vi.fn()} />);
    const active = screen.getByRole('button', { name: '1M' });
    const inactive = screen.getByRole('button', { name: '1H' });
    expect(active.style.background).toBe('var(--primary-bright)');
    expect(active.style.color).toBe('var(--bg)');
    expect(inactive.style.background).toBe('transparent');
  });

  it('renders a trailing node when provided', () => {
    render(
      <TimeRangePicker
        value="1h"
        onChange={vi.fn()}
        trailing={<span data-testid="live-dot">live</span>}
      />,
    );
    expect(screen.getByTestId('live-dot')).toHaveTextContent('live');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <TimeRangePicker value="24h" onChange={vi.fn()} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
