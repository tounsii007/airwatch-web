// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('<Spinner />', () => {
  it('renders with role=status and a sr-only label', () => {
    render(<Spinner label="Fetching" />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent('Fetching');
  });

  it('applies the variant color class', () => {
    const { container } = render(<Spinner variant="muted" />);
    expect(container.querySelector('[role="status"]')).toHaveClass('text-[var(--text-muted)]');
  });

  it('uses the passed size for the spinner element', () => {
    const { container } = render(<Spinner size={24} />);
    const ring = container.querySelector('.animate-spin') as HTMLElement | null;
    expect(ring?.style.width).toBe('24px');
    expect(ring?.style.height).toBe('24px');
  });
});
