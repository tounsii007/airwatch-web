// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlassPanel } from '@/components/ui/GlassPanel';

describe('<GlassPanel />', () => {
  it('renders children', () => {
    render(<GlassPanel>hi</GlassPanel>);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('merges className with the base glass-panel class', () => {
    const { container } = render(<GlassPanel className="p-4">x</GlassPanel>);
    expect(container.firstChild).toHaveClass('glass-panel', 'p-4');
  });

  it('invokes onClick', async () => {
    const onClick = vi.fn();
    render(<GlassPanel onClick={onClick}>click</GlassPanel>);
    await userEvent.click(screen.getByText('click'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
