// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailsHeaderActions } from '@/components/flight/details/DetailsHeaderActions';

describe('<DetailsHeaderActions />', () => {
  const defaults = {
    size: 14,
    isRefreshing: false,
    refreshStatus: 'idle' as const,
    isFav: false,
    onRefresh: () => {},
    onToggleFavorite: () => {},
    onClose: () => {},
  };

  it('renders 3 action buttons (refresh / favorite / close)', () => {
    render(<DetailsHeaderActions {...defaults} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('fires onRefresh when refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    render(<DetailsHeaderActions {...defaults} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByLabelText('Refresh'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('fires onToggleFavorite when star is clicked', async () => {
    const onToggleFavorite = vi.fn();
    render(<DetailsHeaderActions {...defaults} onToggleFavorite={onToggleFavorite} />);
    await userEvent.click(screen.getByLabelText('Toggle favorite'));
    expect(onToggleFavorite).toHaveBeenCalledOnce();
  });

  it('fires onClose when close is clicked', async () => {
    const onClose = vi.fn();
    render(<DetailsHeaderActions {...defaults} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows the success icon on status=success', () => {
    const { container } = render(<DetailsHeaderActions {...defaults} refreshStatus="success" />);
    expect(container.querySelector('.text-\\[var\\(--success\\)\\]')).toBeTruthy();
  });

  it('shows the error icon on status=error', () => {
    const { container } = render(<DetailsHeaderActions {...defaults} refreshStatus="error" />);
    expect(container.querySelector('.text-\\[var\\(--error\\)\\]')).toBeTruthy();
  });

  it('spins the refresh icon while refreshing', () => {
    const { container } = render(<DetailsHeaderActions {...defaults} isRefreshing />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('highlights the star when isFav=true', () => {
    const { container } = render(<DetailsHeaderActions {...defaults} isFav />);
    const star = container.querySelector('.fill-\\[var\\(--accent\\)\\]');
    expect(star).toBeTruthy();
  });
});
