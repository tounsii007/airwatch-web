// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Accessibility smoke tests. axe-core runs against the DOM and flags WCAG
 * violations (missing labels, bad contrast meta, malformed ARIA, etc.).
 */
describe('<StatusBadge /> — a11y', () => {
  it('has no axe violations for a rendered status', async () => {
    const { container } = render(<StatusBadge status="en-route" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no axe violations for an unknown status', async () => {
    const { container } = render(<StatusBadge status="diverted" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
