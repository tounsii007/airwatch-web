// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('<EmptyState />', () => {
  it('renders the title', () => {
    render(<EmptyState title="No flights" />);
    expect(screen.getByText('No flights')).toBeInTheDocument();
  });

  it('renders body and action when provided', () => {
    render(
      <EmptyState
        title="Empty"
        body="Add something to get started."
        action={<button>Add</button>}
      />,
    );
    expect(screen.getByText('Add something to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('omits the icon halo when no icon is supplied', () => {
    const { container } = render(<EmptyState title="X" />);
    // The halo is a span with explicit dimensions — without an icon we
    // render no such span.
    expect(container.querySelectorAll('span').length).toBe(0);
  });

  it('renders the icon inside the halo when supplied', () => {
    render(<EmptyState title="X" icon={<svg data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('exposes role=status for assistive tech', () => {
    render(<EmptyState title="X" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('drops the glass-panel chrome when bare=true', () => {
    const { container } = render(<EmptyState bare title="X" />);
    expect(container.firstChild).not.toHaveClass('glass-panel');
  });
});
