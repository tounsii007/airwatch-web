// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from '@/components/ui/IconButton';

describe('<IconButton />', () => {
  it('renders with the accessible label', () => {
    render(
      <IconButton aria-label="Refresh">
        <span data-testid="icon" />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('marks aria-pressed when active', () => {
    render(<IconButton aria-label="Toggle" active><span /></IconButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows spinner and disables while loading', () => {
    const { container } = render(
      <IconButton aria-label="Wait" loading>
        <span data-testid="icon" />
      </IconButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('invokes onClick', async () => {
    const onClick = vi.fn();
    render(<IconButton aria-label="Hit" onClick={onClick}><span /></IconButton>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the info tone tint when active + tone="info"', () => {
    render(<IconButton aria-label="Radar" active tone="info"><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-[var(--info)]');
    expect(btn.className).toContain('bg-[var(--info)]');
    expect(btn.className).toContain('border-[var(--info)]');
  });

  it('applies the accent tone tint when active + tone="accent"', () => {
    render(<IconButton aria-label="Cargo" active tone="accent"><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-[var(--accent)]');
  });

  it('falls back to primary tone tint by default when active', () => {
    render(<IconButton aria-label="Default" active><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-[var(--primary)]');
  });

  it('does NOT apply any tone tint when inactive', () => {
    render(<IconButton aria-label="Off" tone="info"><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('bg-[var(--info)]');
  });

  it('expands the hit area on sm via ::after pseudo-element', () => {
    render(<IconButton aria-label="Small" size="sm"><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('after:-inset-2');
  });

  it('expands the hit area on md', () => {
    render(<IconButton aria-label="Medium" size="md"><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('after:-inset-1');
  });

  it('does NOT add hit-area expansion on lg (already 44×44 px)', () => {
    render(<IconButton aria-label="Large" size="lg"><span /></IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('after:-inset');
  });
});
