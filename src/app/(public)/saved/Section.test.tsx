// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Section } from './Section';

describe('<Section />', () => {
  it('renders title and children', () => {
    render(
      <Section title="Airlines">
        <div data-testid="child">child</div>
      </Section>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Airlines' })).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders an icon node when supplied', () => {
    render(
      <Section title="Stars" icon={<span data-testid="icon">★</span>}>
        <span>x</span>
      </Section>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('uses the muted accent class by default', () => {
    render(<Section title="Default"><span>x</span></Section>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.className).toContain('text-[var(--text-muted)]');
  });

  it('switches to the warning accent when accent="warning"', () => {
    render(<Section title="Stale" accent="warning"><span>x</span></Section>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.className).toContain('text-[var(--warning)]');
    expect(heading.className).not.toContain('text-[var(--text-muted)]');
  });
});
