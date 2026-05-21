// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('<Card />', () => {
  it('renders its children', () => {
    render(<Card>hello</Card>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('renders the title in a heading element when set', () => {
    render(<Card title="My card">x</Card>);
    expect(screen.getByRole('heading', { name: /My card/ })).toBeInTheDocument();
  });

  it('renders the subtitle below the title', () => {
    render(<Card title="t" subtitle="explainer">x</Card>);
    expect(screen.getByText('explainer')).toBeInTheDocument();
  });

  it('renders the badge inline with the title', () => {
    render(
      <Card title="Live" badge={<span data-testid="b">12</span>}>
        x
      </Card>,
    );
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });

  it('renders the action slot on the right of the header', () => {
    render(
      <Card title="t" action={<button>Sort</button>}>
        x
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
  });

  it('omits the header when no header slots are filled', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.querySelector('header')).toBeNull();
  });

  it('renders the footer when provided', () => {
    render(<Card footer={<span>See all</span>}>x</Card>);
    expect(screen.getByText('See all')).toBeInTheDocument();
  });

  it('drops padding from the body in bare mode', () => {
    const { container } = render(<Card bare>x</Card>);
    const body = container.querySelector('div > div');
    expect(body?.className).not.toMatch(/\bp-4\b/);
  });
});
