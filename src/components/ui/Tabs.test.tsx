// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from '@/components/ui/Tabs';

const TABS = [
  { value: 'route', label: 'Route' },
  { value: 'aircraft', label: 'Aircraft' },
  { value: 'sched', label: 'Schedule' },
] as const;

describe('<Tabs />', () => {
  it('renders all tabs with role=tab', () => {
    render(<Tabs value="route" onChange={() => {}} tabs={TABS} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks the selected tab with aria-selected', () => {
    render(<Tabs value="aircraft" onChange={() => {}} tabs={TABS} />);
    expect(screen.getByRole('tab', { name: 'Aircraft' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Route' })).toHaveAttribute('aria-selected', 'false');
  });

  it('invokes onChange with the clicked tab value', async () => {
    const onChange = vi.fn();
    render(<Tabs value="route" onChange={onChange} tabs={TABS} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
    expect(onChange).toHaveBeenCalledWith('sched');
  });

  it('renders the count badge when provided', () => {
    const tabs = [
      { value: 'a', label: 'A', count: 3 },
      { value: 'b', label: 'B' },
    ] as const;
    render(<Tabs value="a" onChange={() => {}} tabs={tabs} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not invoke onChange for disabled tabs', async () => {
    const onChange = vi.fn();
    const tabs = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ] as const;
    render(<Tabs value="a" onChange={onChange} tabs={tabs} />);
    await userEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
