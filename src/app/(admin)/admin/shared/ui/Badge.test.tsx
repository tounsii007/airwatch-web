// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Badge } from './Badge';

describe('<Badge /> (admin shared/ui)', () => {
  it('renders its children as the visible text', () => {
    render(<Badge>Live</Badge>);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('applies the neutral tone by default', () => {
    render(<Badge>Idle</Badge>);
    expect(screen.getByText('Idle')).toHaveClass('text-text-secondary');
  });

  it('applies the requested tone class', () => {
    render(<Badge tone="success">Up</Badge>);
    expect(screen.getByText('Up')).toHaveClass('text-success');
  });

  it('renders an aria-hidden dot only when dot is set', () => {
    const { container, rerender } = render(<Badge>Plain</Badge>);
    expect(container.querySelector('[aria-hidden]')).toBeNull();

    rerender(
      <Badge dot tone="info">
        Streaming
      </Badge>,
    );
    // The dot is decorative — it must not be exposed to assistive tech.
    expect(container.querySelector('span[aria-hidden]')).not.toBeNull();
  });

  it('merges a caller-supplied className', () => {
    render(<Badge className="custom-pill">Tag</Badge>);
    const el = screen.getByText('Tag');
    expect(el).toHaveClass('custom-pill');
    // …without dropping its own base classes.
    expect(el).toHaveClass('rounded');
  });

  it('spreads arbitrary span attributes (id, aria-label, data-*)', () => {
    render(
      <Badge id="b1" aria-label="connection status" data-testid="badge">
        OK
      </Badge>,
    );
    const el = screen.getByTestId('badge');
    expect(el).toHaveAttribute('id', 'b1');
    expect(el).toHaveAttribute('aria-label', 'connection status');
  });

  it('forwards a ref to the underlying span element', () => {
    const ref = { current: null as HTMLSpanElement | null };
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Badge tone="warning" dot>Degraded</Badge>);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
