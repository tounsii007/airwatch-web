// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { WorldMap } from './WorldMap';

describe('<WorldMap /> — a11y', () => {
  it('SVG has an accessible name (role=img + aria-label)', async () => {
    const { container } = render(<WorldMap data={{}} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBeTruthy();
  });

  it('has no axe violations in the empty state', async () => {
    const { container } = render(<WorldMap data={{}} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no axe violations when populated with country counts', async () => {
    const { container } = render(<WorldMap data={{ DE: 12, US: 4, FR: 1 }} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
