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
});
