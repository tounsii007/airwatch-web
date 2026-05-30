// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Button } from './Button';

describe('<Button /> (admin shared/ui)', () => {
  it('renders its label as an accessible button', () => {
    render(<Button>Restart</Button>);
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
  });

  it('applies the primary variant + base classes by default', () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('text-primary-bright');
    expect(btn).toHaveClass('uppercase');
  });

  it('maps variant and size props to their token classes', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('text-error'); // danger variant
    expect(btn).toHaveClass('px-4'); // lg size
  });

  it('invokes onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Hit</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and swallows clicks when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders the leading icon inside an aria-hidden wrapper', () => {
    render(<Button leadingIcon={<span data-testid="icon" />}>Save</Button>);
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    // Decorative icon must be hidden from assistive tech; the label carries meaning.
    expect(icon.parentElement).toHaveAttribute('aria-hidden');
  });

  it('merges className and forwards native attributes (type)', () => {
    render(
      <Button className="w-full" type="submit">
        Submit
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('w-full');
    expect(btn).toHaveAttribute('type', 'submit');
  });

  it('forwards a ref to the underlying button element', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <Button variant="outline" leadingIcon="⟳">
        Refresh
      </Button>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
