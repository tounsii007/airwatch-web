// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tag } from '@/components/ui/Tag';

describe('<Tag />', () => {
  it('renders its content', () => {
    render(<Tag>FRA</Tag>);
    expect(screen.getByText('FRA')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Tag variant="success">Live</Tag>);
    expect(screen.getByText('Live').closest('.badge')).toHaveClass('badge-success');
  });

  it('adds the .badge-dot helper when `dot` is set', () => {
    render(<Tag dot>Live</Tag>);
    expect(screen.getByText('Live').closest('.badge')).toHaveClass('badge-dot');
  });

  it('renders the dismiss button when onDismiss is supplied', async () => {
    const onDismiss = vi.fn();
    render(
      <Tag onDismiss={onDismiss} dismissLabel="Remove FRA">
        FRA
      </Tag>,
    );
    const btn = screen.getByRole('button', { name: 'Remove FRA' });
    await userEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('omits the dismiss button by default', () => {
    render(<Tag>FRA</Tag>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
