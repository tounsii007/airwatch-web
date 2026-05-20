// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '@/components/ui/Switch';

describe('<Switch />', () => {
  it('renders with the aria-checked state mirroring `checked`', () => {
    const { rerender } = render(
      <Switch checked={false} onChange={() => {}} label="Metric" />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch checked onChange={() => {}} label="Metric" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles via the click handler', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Metric" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles via keyboard (Space)', async () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} label="Metric" />);
    const switchEl = screen.getByRole('switch');
    switchEl.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not invoke onChange when disabled', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} disabled label="X" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders without a label and still has the switch role', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="External" />);
    expect(screen.getByRole('switch', { name: 'External' })).toBeInTheDocument();
  });
});
