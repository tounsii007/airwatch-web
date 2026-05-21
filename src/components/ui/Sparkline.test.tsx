// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from '@/components/ui/Sparkline';

describe('<Sparkline />', () => {
  it('renders nothing for empty data', () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for a single point', () => {
    const { container } = render(<Sparkline data={[42]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an SVG with a path for two or more points', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('renders the fill gradient by default', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    expect(container.querySelector('linearGradient')).toBeInTheDocument();
  });

  it('omits the fill gradient when showFill=false', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} showFill={false} />);
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument();
  });

  it('renders the end dot by default and skips it when disabled', () => {
    const { container, rerender } = render(<Sparkline data={[1, 2, 3]} />);
    expect(container.querySelector('circle')).toBeInTheDocument();
    rerender(<Sparkline data={[1, 2, 3]} showEndDot={false} />);
    expect(container.querySelector('circle')).not.toBeInTheDocument();
  });

  it('exposes role=img with the supplied ariaLabel', () => {
    const { getByRole } = render(<Sparkline data={[1, 2, 3]} ariaLabel="Errors over time" />);
    expect(getByRole('img', { name: 'Errors over time' })).toBeInTheDocument();
  });
});
