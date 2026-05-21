// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kbd } from '@/components/ui/Kbd';

describe('<Kbd />', () => {
  it('renders a single keycap from children', () => {
    render(<Kbd>⌘K</Kbd>);
    expect(screen.getByText('⌘K').tagName).toBe('KBD');
  });

  it('renders multiple keycaps from the keys array', () => {
    render(<Kbd keys={['Shift', 'Enter']} />);
    expect(screen.getByText('Shift')).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });

  it('renders nothing when neither children nor keys is supplied', () => {
    const { container } = render(<Kbd />);
    expect(container.firstChild).toBeNull();
  });
});
