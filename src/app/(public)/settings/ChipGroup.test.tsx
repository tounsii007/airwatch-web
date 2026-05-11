// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChipGroup } from './ChipGroup';

type Mode = 'light' | 'dark' | 'system';
const opts = [
  { value: 'light'  as Mode, label: 'Light' },
  { value: 'dark'   as Mode, label: 'Dark' },
  { value: 'system' as Mode, label: 'System' },
];

describe('<ChipGroup />', () => {
  it('renders one button per option with the matching label', () => {
    render(<ChipGroup options={opts} value="dark" onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument();
  });

  it('marks the active chip with the active class set', () => {
    render(<ChipGroup options={opts} value="dark" onChange={() => {}} />);
    const dark = screen.getByRole('button', { name: 'Dark' });
    const light = screen.getByRole('button', { name: 'Light' });
    expect(dark.className).toContain('text-[var(--primary)]');
    expect(light.className).not.toContain('text-[var(--primary)]');
  });

  it('emits onChange with the new value on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipGroup options={opts} value="dark" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(onChange).toHaveBeenCalledWith('system');
  });

  it('renders the icon when supplied per-option', () => {
    const withIcon = [
      { value: 'a', label: 'A', icon: <span data-testid="icon-a">★</span> },
      { value: 'b', label: 'B' },
    ];
    render(<ChipGroup options={withIcon} value="a" onChange={() => {}} />);
    expect(screen.getByTestId('icon-a')).toBeInTheDocument();
  });
});
