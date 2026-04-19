// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NeonText } from '@/components/ui/NeonText';

describe('<NeonText />', () => {
  it('renders the given text', () => {
    render(<NeonText text="HELLO" />);
    expect(screen.getByText('HELLO')).toBeInTheDocument();
  });

  it('applies the default size class', () => {
    render(<NeonText text="X" />);
    expect(screen.getByText('X')).toHaveClass('text-xl');
  });

  it('respects custom size', () => {
    render(<NeonText text="X" size="text-3xl" />);
    expect(screen.getByText('X')).toHaveClass('text-3xl');
  });

  it('applies inline color when given', () => {
    render(<NeonText text="X" color="#ff0000" />);
    const el = screen.getByText('X');
    expect(el).toHaveStyle({ color: '#ff0000' });
  });

  it('merges extra className', () => {
    render(<NeonText text="X" className="extra-cls" />);
    expect(screen.getByText('X')).toHaveClass('extra-cls');
  });
});
