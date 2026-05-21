// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

const OPTIONS = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
  { value: 'map', label: 'Map' },
] as const;

describe('<SegmentedControl />', () => {
  it('renders one button per option', () => {
    render(
      <SegmentedControl value="list" onChange={() => {}} options={OPTIONS} />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks the active option with aria-checked', () => {
    render(
      <SegmentedControl value="grid" onChange={() => {}} options={OPTIONS} />,
    );
    expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked value', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl value="list" onChange={onChange} options={OPTIONS} />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Grid' }));
    expect(onChange).toHaveBeenCalledWith('grid');
  });

  it('moves selection with ArrowRight / ArrowLeft', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl value="list" onChange={onChange} options={OPTIONS} />,
    );
    const first = screen.getByRole('radio', { name: 'List' });
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('grid');
  });

  it('skips disabled neighbours when navigating via keyboard', async () => {
    const onChange = vi.fn();
    const options = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
    ] as const;
    render(<SegmentedControl value="a" onChange={onChange} options={options} />);

    screen.getByRole('radio', { name: 'A' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('does not call onChange when a disabled segment is clicked', async () => {
    const onChange = vi.fn();
    const options = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ] as const;
    render(<SegmentedControl value="a" onChange={onChange} options={options} />);
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
