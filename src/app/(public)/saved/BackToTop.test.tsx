// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackToTop } from './BackToTop';

describe('<BackToTop />', () => {
  it('renders the TOP label inside a button', () => {
    render(<BackToTop />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain('TOP');
  });

  it('calls window.scrollTo with smooth behaviour on click', async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { value: scrollTo, writable: true, configurable: true });

    const user = userEvent.setup();
    render(<BackToTop />);
    await user.click(screen.getByRole('button'));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
