// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '@/components/ui/Skeleton';

describe('<Skeleton />', () => {
  it('renders the announcer wrapper with role=status', () => {
    render(
      <Skeleton>
        <Skeleton.Line />
      </Skeleton>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('Line renders a div with the .skeleton class and the requested width', () => {
    const { container } = render(<Skeleton.Line width="40%" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('skeleton');
    expect(el.style.width).toBe('40%');
  });

  it('Block renders with the default height when omitted', () => {
    const { container } = render(<Skeleton.Block />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.height).toBe('6rem');
  });

  it('Circle renders a circular placeholder of the requested size', () => {
    const { container } = render(<Skeleton.Circle size="3rem" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('999px');
    expect(el.style.width).toBe('3rem');
  });

  it('Tile renders the requested number of placeholder lines', () => {
    const { container } = render(<Skeleton.Tile lines={3} />);
    // 1 header line + 3 body lines = 4
    expect(container.querySelectorAll('.skeleton')).toHaveLength(4);
  });

  it('Row renders an avatar by default', () => {
    const { container } = render(<Skeleton.Row />);
    // 1 circle + 2 lines (title + subtitle)
    expect(container.querySelectorAll('.skeleton')).toHaveLength(3);
  });

  it('Row can be rendered without an avatar', () => {
    const { container } = render(<Skeleton.Row showAvatar={false} />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(2);
  });

  it('Stat renders a stat-card placeholder', () => {
    const { container } = render(<Skeleton.Stat />);
    expect(container.firstChild).toHaveClass('stat-card');
  });
});
