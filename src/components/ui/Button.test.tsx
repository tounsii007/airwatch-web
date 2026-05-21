// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('<Button />', () => {
  it('renders its label', () => {
    render(<Button>Track</Button>);
    expect(screen.getByRole('button', { name: 'Track' })).toBeInTheDocument();
  });

  it('applies the primary variant class', () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('falls back to the secondary `.btn` class by default', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn');
  });

  it('disables the button while loading and shows a spinner', () => {
    const { container } = render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    // The spinner is a positioned span sibling of the label.
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('invokes onClick when not loading', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Hit</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not invoke onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Hit</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders leading and trailing icons', () => {
    render(
      <Button
        leadingIcon={<span data-testid="lead" />}
        trailingIcon={<span data-testid="trail" />}
      >
        Both
      </Button>,
    );
    expect(screen.getByTestId('lead')).toBeInTheDocument();
    expect(screen.getByTestId('trail')).toBeInTheDocument();
  });

  it('hides the leading icon when loading (spinner replaces it)', () => {
    render(
      <Button loading leadingIcon={<span data-testid="lead" />}>
        Saving
      </Button>,
    );
    expect(screen.queryByTestId('lead')).not.toBeInTheDocument();
  });

  it('respects fullWidth', () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('forwards a ref to the underlying button element', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
