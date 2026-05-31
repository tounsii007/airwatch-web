// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { HBar } from './HBar';

/** The inner fill divs are the only elements with a percentage width. */
function fills(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('div')).filter((d) =>
    d.style.width.endsWith('%'),
  );
}

describe('<HBar />', () => {
  it('shows a no-data hint for an empty list', () => {
    render(<HBar items={[]} />);
    expect(screen.getByText('No data.')).toBeInTheDocument();
  });

  it('renders a row per item with label and formatted value', () => {
    render(
      <HBar items={[{ label: 'DE', value: 1234 }, { label: 'FR', value: 567 }]} />,
    );
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('FR')).toBeInTheDocument();
    // Default formatter is toLocaleString — derive expected the same way.
    expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText((567).toLocaleString())).toBeInTheDocument();
  });

  it('scales the widest bar to 100% and the rest relative to it', () => {
    const { container } = render(
      <HBar items={[{ label: 'a', value: 100 }, { label: 'b', value: 25 }]} />,
    );
    expect(fills(container).map((d) => d.style.width)).toEqual(['100%', '25%']);
  });

  it('handles an all-zero list without dividing by zero', () => {
    const { container } = render(
      <HBar items={[{ label: 'a', value: 0 }, { label: 'b', value: 0 }]} />,
    );
    expect(fills(container).map((d) => d.style.width)).toEqual(['0%', '0%']);
  });

  it('fills a single item to 100%', () => {
    const { container } = render(<HBar items={[{ label: 'solo', value: 7 }]} />);
    expect(fills(container).map((d) => d.style.width)).toEqual(['100%']);
  });

  it('appends a unit to the value', () => {
    render(<HBar items={[{ label: 'a', value: 42 }]} unit="%" />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('honours a custom format function', () => {
    render(
      <HBar items={[{ label: 'a', value: 1500 }]} format={(n) => `${n / 1000}k`} />,
    );
    expect(screen.getByText('1.5k')).toBeInTheDocument();
  });

  it('applies a per-row colour to the value text', () => {
    render(<HBar items={[{ label: 'a', value: 5, color: 'var(--error)' }]} />);
    expect(screen.getByText('5').style.color).toBe('var(--error)');
  });

  it('renders an optional badge before the label', () => {
    render(
      <HBar
        items={[{ label: 'a', value: 5, badge: <i data-testid="flag" /> }]}
      />,
    );
    expect(screen.getByTestId('flag')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <HBar items={[{ label: 'a', value: 5 }, { label: 'b', value: 3 }]} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
