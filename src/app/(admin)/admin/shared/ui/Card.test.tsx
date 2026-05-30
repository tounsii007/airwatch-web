// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card';

describe('<Card /> family (admin shared/ui)', () => {
  it('renders the container with the card data-slot and its children', () => {
    const { container } = render(<Card>Body</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).not.toBeNull();
    expect(card).toHaveTextContent('Body');
  });

  it('renders CardTitle as a level-3 heading', () => {
    render(<CardTitle>Throughput</CardTitle>);
    const heading = screen.getByRole('heading', { level: 3, name: 'Throughput' });
    expect(heading.tagName).toBe('H3');
    expect(heading).toHaveAttribute('data-slot', 'card-title');
  });

  it('renders CardDescription as a paragraph', () => {
    render(<CardDescription>Requests per second</CardDescription>);
    const desc = screen.getByText('Requests per second');
    expect(desc.tagName).toBe('P');
    expect(desc).toHaveAttribute('data-slot', 'card-description');
  });

  it('tags header, content and footer with their data-slots', () => {
    const { container } = render(
      <Card>
        <CardHeader>h</CardHeader>
        <CardContent>c</CardContent>
        <CardFooter>f</CardFooter>
      </Card>,
    );
    expect(container.querySelector('[data-slot="card-header"]')).toHaveTextContent('h');
    expect(container.querySelector('[data-slot="card-content"]')).toHaveTextContent('c');
    expect(container.querySelector('[data-slot="card-footer"]')).toHaveTextContent('f');
  });

  it('merges a caller-supplied className without dropping base classes', () => {
    const { container } = render(<Card className="ring-2">x</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveClass('ring-2');
    expect(card).toHaveClass('rounded-md');
  });

  it('forwards a ref to the underlying div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Card ref={ref}>x</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('composes a full card with all six slots present', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>CPU</CardTitle>
          <CardDescription>last 24h</CardDescription>
        </CardHeader>
        <CardContent>graph</CardContent>
        <CardFooter>updated now</CardFooter>
      </Card>,
    );
    for (const slot of [
      'card',
      'card-header',
      'card-title',
      'card-description',
      'card-content',
      'card-footer',
    ]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
  });

  it('has no axe violations for a fully composed card', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Heap</CardTitle>
          <CardDescription>JVM memory</CardDescription>
        </CardHeader>
        <CardContent>512 MB</CardContent>
        <CardFooter>ok</CardFooter>
      </Card>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
