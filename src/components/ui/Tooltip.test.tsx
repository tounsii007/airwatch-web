// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip, MaybeTooltip } from '@/components/ui/Tooltip';

describe('<Tooltip />', () => {
  it('renders the trigger child', () => {
    render(
      <Tooltip label="Sort">
        <button>btn</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'btn' })).toBeInTheDocument();
  });

  it('exposes the label as role=tooltip in the DOM', () => {
    render(
      <Tooltip label="Sort by departure">
        <button>btn</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sort by departure');
  });

  it('forceOpen makes the tooltip visible', () => {
    render(
      <Tooltip label="Always" forceOpen>
        <button>btn</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveClass('opacity-100');
  });
});

describe('<MaybeTooltip />', () => {
  it('passes children through unchanged when label is missing', () => {
    render(
      <MaybeTooltip>
        <button>plain</button>
      </MaybeTooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'plain' })).toBeInTheDocument();
  });

  it('wraps children with Tooltip when a label is set', () => {
    render(
      <MaybeTooltip label="Has label">
        <button>btn</button>
      </MaybeTooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Has label');
  });
});
