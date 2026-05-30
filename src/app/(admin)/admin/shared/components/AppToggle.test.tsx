// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { AppToggle } from './AppToggle';

describe('<AppToggle />', () => {
  it('renders web + mobile tabs inside a tablist', () => {
    render(<AppToggle value="web" onChange={vi.fn()} />);
    const tablist = screen.getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['web', 'mobile']);
  });

  it('marks only the active app as aria-selected', () => {
    render(<AppToggle value="mobile" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'mobile' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'web' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked app key', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppToggle value="web" onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: 'mobile' }));
    expect(onChange).toHaveBeenCalledWith('mobile');
  });

  it('still fires onChange when the already-active tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppToggle value="web" onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: 'web' }));
    expect(onChange).toHaveBeenCalledWith('web');
  });

  it('fills the active tab with the default accent and leaves the other transparent', () => {
    render(<AppToggle value="web" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'web' }).style.background).toBe(
      'var(--primary-bright)',
    );
    expect(screen.getByRole('tab', { name: 'mobile' }).style.background).toBe(
      'transparent',
    );
  });

  it('honours a custom activeColor', () => {
    render(
      <AppToggle value="mobile" onChange={vi.fn()} activeColor="var(--accent)" />,
    );
    expect(screen.getByRole('tab', { name: 'mobile' }).style.background).toBe(
      'var(--accent)',
    );
  });

  it('has no axe violations', async () => {
    const { container } = render(<AppToggle value="web" onChange={vi.fn()} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
