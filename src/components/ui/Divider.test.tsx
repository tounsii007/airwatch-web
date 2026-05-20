// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Divider } from '@/components/ui/Divider';

describe('<Divider />', () => {
  it('renders a plain horizontal rule by default', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('renders an inline label between two rules when label is set', () => {
    render(<Divider label="Section" />);
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Section' })).toBeInTheDocument();
  });

  it('renders a vertical separator with orientation attribute', () => {
    render(<Divider orientation="vertical" />);
    const sep = screen.getByRole('separator');
    expect(sep).toHaveAttribute('aria-orientation', 'vertical');
  });
});
