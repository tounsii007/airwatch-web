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

  it('applies the elevated variant class', () => {
    const { container } = render(<GlassPanel variant="elevated">x</GlassPanel>);
    expect(container.firstChild).toHaveClass('glass-panel-elevated');
  });

  it('applies the floating variant class', () => {
    const { container } = render(<GlassPanel variant="floating">x</GlassPanel>);
    expect(container.firstChild).toHaveClass('glass-panel-floating');
  });

  it('adds the interactive and shimmer flags as classes', () => {
    const { container } = render(
      <GlassPanel interactive shimmer>x</GlassPanel>,
    );
    expect(container.firstChild).toHaveClass('glass-panel', 'interactive', 'shimmer');
  });

  it('does not add the flag classes when the props are false', () => {
    const { container } = render(<GlassPanel>x</GlassPanel>);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('interactive')).toBe(false);
    expect(el.classList.contains('shimmer')).toBe(false);
  });
});
