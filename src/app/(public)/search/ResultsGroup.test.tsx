// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsGroup } from './ResultsGroup';

describe('<ResultsGroup />', () => {
  it('renders title with the count badge and children when count > 0', () => {
    render(
      <ResultsGroup title="Airlines" count={3}>
        <div data-testid="row">a</div>
      </ResultsGroup>,
    );
    expect(screen.getByRole('heading', { level: 3, name: /Airlines \(3\)/ })).toBeInTheDocument();
    expect(screen.getByTestId('row')).toBeInTheDocument();
  });

  it('renders nothing when count is 0', () => {
    const { container } = render(
      <ResultsGroup title="Airlines" count={0}>
        <div data-testid="row">a</div>
      </ResultsGroup>,
    );
    expect(container.firstChild).toBeNull();
  });
});
