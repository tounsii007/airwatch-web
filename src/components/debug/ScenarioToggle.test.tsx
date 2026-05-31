// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { MockScenario } from '@/lib/flights/mockAircraft';
import { ScenarioToggle } from './ScenarioToggle';

function makeScenario(overrides: Partial<MockScenario> = {}): MockScenario {
  return {
    id: 'emer',
    label: 'Emergency-Squawks',
    icon: '🚨',
    description: 'five emergency flights over Europe',
    color: 'error',
    prefix: 'mock:emer:',
    build: () => [],
    ...overrides,
  };
}

const dotOf = (container: HTMLElement) =>
  container.querySelector('span.rounded-full') as HTMLElement;

describe('<ScenarioToggle />', () => {
  it('renders the scenario label, description, and icon', () => {
    render(<ScenarioToggle scenario={makeScenario()} active={false} onToggle={() => {}} />);
    expect(screen.getByText('Emergency-Squawks')).toBeInTheDocument();
    expect(screen.getByText('five emergency flights over Europe')).toBeInTheDocument();
    expect(screen.getByText('🚨')).toBeInTheDocument();
  });

  it('invokes onToggle when the row is clicked', () => {
    const onToggle = vi.fn();
    render(<ScenarioToggle scenario={makeScenario()} active={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('wears the scenario colour while active', () => {
    render(<ScenarioToggle scenario={makeScenario()} active onToggle={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-[var(--error)]/15');
    expect(button.className).toContain('border');
  });

  it('falls back to a muted style while inactive', () => {
    render(<ScenarioToggle scenario={makeScenario()} active={false} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-[var(--text-muted)]');
    expect(button.className).not.toContain('bg-[var(--error)]/15');
  });

  it('lights the status dot in the scenario colour and pulses it when active', () => {
    const { container } = render(
      <ScenarioToggle scenario={makeScenario()} active onToggle={() => {}} />,
    );
    const dot = dotOf(container);
    expect(dot.style.backgroundColor).toContain('var(--error)');
    expect(dot.className).toContain('animate-pulse-glow');
  });

  it('greys and stills the status dot when inactive', () => {
    const { container } = render(
      <ScenarioToggle scenario={makeScenario()} active={false} onToggle={() => {}} />,
    );
    const dot = dotOf(container);
    expect(dot.style.backgroundColor).toContain('var(--text-muted)');
    expect(dot.className).not.toContain('animate-pulse-glow');
  });

  it('maps a different scenario colour onto both the row and the dot', () => {
    const { container } = render(
      <ScenarioToggle
        scenario={makeScenario({ color: 'warning', label: 'Disrupted' })}
        active
        onToggle={() => {}}
      />,
    );
    expect(screen.getByRole('button').className).toContain('bg-[var(--warning)]/15');
    expect(dotOf(container).style.backgroundColor).toContain('var(--warning)');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ScenarioToggle scenario={makeScenario()} active onToggle={() => {}} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
