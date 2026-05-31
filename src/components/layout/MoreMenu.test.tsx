// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SECONDARY_ITEMS } from '@/components/layout/navItems';
import { MoreMenuSheet, MoreMenuTrigger } from './MoreMenu';

// A mutable holder the next/navigation mock reads, so each test can
// pin the "current route" before rendering.
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

// next/link routes through Next's router; in unit tests we only need a
// plain anchor that still forwards onClick/className.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

beforeEach(() => {
  nav.pathname = '/';
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('<MoreMenuTrigger />', () => {
  it('is a collapsed dialog button while closed', () => {
    render(<MoreMenuTrigger open={false} onToggle={() => {}} onClose={() => {}} />);
    const button = screen.getByRole('button', { name: 'nav_more' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveAttribute('data-pill-active');
    expect(button.className).toContain('text-[var(--text-muted)]');
  });

  it('reflects the open state on the trigger', () => {
    render(<MoreMenuTrigger open onToggle={() => {}} onClose={() => {}} />);
    const button = screen.getByRole('button', { name: 'nav_more' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('data-pill-active', 'true');
    expect(button.className).toContain('text-[var(--primary)]');
  });

  it('fires onToggle when pressed', () => {
    const onToggle = vi.fn();
    render(<MoreMenuTrigger open={false} onToggle={onToggle} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'nav_more' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('<MoreMenuSheet />', () => {
  it('renders nothing while closed', () => {
    render(<MoreMenuSheet open={false} onToggle={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a modal dialog listing every secondary route', () => {
    render(<MoreMenuSheet open onToggle={() => {}} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'nav_more' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getAllByRole('link')).toHaveLength(SECONDARY_ITEMS.length);
    for (const item of SECONDARY_ITEMS) {
      const link = screen.getByRole('link', { name: item.labelKey });
      expect(link).toHaveAttribute('href', item.href);
    }
  });

  it('highlights the link for the active exact route', () => {
    nav.pathname = '/cargo';
    render(<MoreMenuSheet open onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('link', { name: 'nav_cargo' }).className).toContain(
      'text-[var(--primary)]',
    );
    expect(screen.getByRole('link', { name: 'nav_stats' }).className).not.toContain(
      'text-[var(--primary)]',
    );
  });

  it('treats a nested path as active via the prefix match', () => {
    nav.pathname = '/stats/airlines';
    render(<MoreMenuSheet open onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('link', { name: 'nav_stats' }).className).toContain(
      'text-[var(--primary)]',
    );
  });

  it('dismisses when a destination link is chosen', () => {
    const onClose = vi.fn();
    render(<MoreMenuSheet open onToggle={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('link', { name: 'nav_globe' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses on the backdrop and on the header close button', () => {
    const onClose = vi.fn();
    render(<MoreMenuSheet open onToggle={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'aria_close_menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'aria_close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<MoreMenuSheet open onToggle={() => {}} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves the keydown listener detached once closed', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <MoreMenuSheet open onToggle={() => {}} onClose={onClose} />,
    );
    rerender(<MoreMenuSheet open={false} onToggle={() => {}} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves focus into the sheet on open', () => {
    render(<MoreMenuSheet open onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'aria_close' })).toBe(
      document.activeElement,
    );
  });

  it('has no axe violations while open', async () => {
    const { container } = render(
      <MoreMenuSheet open onToggle={() => {}} onClose={() => {}} />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
