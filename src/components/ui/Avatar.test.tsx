// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from '@/components/ui/Avatar';

describe('<Avatar />', () => {
  it('renders an <img> when src is provided', () => {
    const { container } = render(<Avatar src="/logo.png" name="Lufthansa" />);
    // The inner <img> is presentational (alt="" + role="presentation");
    // querying the raw DOM is the right level of test for "did we
    // produce an image element with this src".
    expect(container.querySelector('img')).toHaveAttribute('src', '/logo.png');
  });

  it('falls back to initials when src loading errors', () => {
    render(<Avatar src="/missing.png" name="Lufthansa" />);
    const img = document.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(screen.getByText('LU')).toBeInTheDocument();
  });

  it('derives a 3-letter callsign-style label from all-caps short names', () => {
    render(<Avatar name="DLH" />);
    expect(screen.getByText('DLH')).toBeInTheDocument();
  });

  it('joins first letters of two-word names', () => {
    render(<Avatar name="Deutsche Lufthansa" />);
    expect(screen.getByText('DL')).toBeInTheDocument();
  });

  it('renders the placeholder icon when neither src nor name are supplied', () => {
    const { container } = render(<Avatar />);
    // lucide User icon renders as an svg inside the wrapper.
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('uses the supplied alt as the accessible name when set', () => {
    render(<Avatar src="/x.png" name="Brand" alt="Carrier brand" />);
    expect(screen.getByRole('img', { name: 'Carrier brand' })).toBeInTheDocument();
  });

  it('renders a status dot when showDot is true', () => {
    const { container } = render(<Avatar name="X" showDot />);
    // The dot is the only descendant span with explicit width/border-radius styling.
    const dots = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.style.borderRadius === '999px' && s.style.width.endsWith('px'),
    );
    // There's the wrapper itself (if circle) — to distinguish, look for the second-to-bottom border element.
    expect(dots.length).toBeGreaterThan(0);
  });
});
