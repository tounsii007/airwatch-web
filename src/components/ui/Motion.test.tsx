// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { FadeIn, ScaleIn, Stagger } from './Motion';

afterEach(() => vi.restoreAllMocks());

describe('<FadeIn />', () => {
  it('wraps children in a fade-up div by default', () => {
    render(<FadeIn>hello</FadeIn>);
    const el = screen.getByText('hello');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass('animate-fade-up');
  });

  it('appends a caller className', () => {
    render(<FadeIn className="extra">hello</FadeIn>);
    expect(screen.getByText('hello')).toHaveClass('animate-fade-up', 'extra');
  });

  it('sets an animation-delay only when delay is positive', () => {
    const { rerender } = render(<FadeIn>hello</FadeIn>);
    expect(screen.getByText('hello').style.animationDelay).toBe('');

    rerender(<FadeIn delay={200}>hello</FadeIn>);
    expect(screen.getByText('hello').style.animationDelay).toBe('200ms');
  });

  it('renders the requested element via the `as` prop', () => {
    render(<FadeIn as="section">hello</FadeIn>);
    expect(screen.getByText('hello').tagName).toBe('SECTION');
  });
});

describe('<ScaleIn />', () => {
  it('wraps children in a scale-in div', () => {
    render(<ScaleIn>scaled</ScaleIn>);
    const el = screen.getByText('scaled');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass('animate-scale-in');
  });

  it('sets an animation-delay only when delay is positive', () => {
    const { rerender } = render(<ScaleIn>scaled</ScaleIn>);
    expect(screen.getByText('scaled').style.animationDelay).toBe('');

    rerender(<ScaleIn delay={120}>scaled</ScaleIn>);
    expect(screen.getByText('scaled').style.animationDelay).toBe('120ms');
  });
});

describe('<Stagger />', () => {
  it('wraps children in a stagger container', () => {
    render(
      <Stagger className="grid">
        <span>a</span>
        <span>b</span>
      </Stagger>,
    );
    const container = screen.getByText('a').parentElement as HTMLElement;
    expect(container).toHaveClass('stagger', 'grid');
  });

  it('warns when the child count exceeds the stagger budget', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Stagger>
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </Stagger>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays quiet at the budget boundary', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Stagger>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </Stagger>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <Stagger>
        <FadeIn>a</FadeIn>
        <FadeIn>b</FadeIn>
      </Stagger>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
