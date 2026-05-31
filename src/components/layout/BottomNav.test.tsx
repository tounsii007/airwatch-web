// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BottomNav } from './BottomNav';

// BottomNav renders a desktop header and a mobile bar simultaneously
// (CSS hides one per breakpoint). happy-dom applies no real CSS, so
// every nav item appears twice — hence the getAllBy* assertions and the
// absence of an axe check (two responsive <header> banners by design).

// The active-pill measurer wires a ResizeObserver, which happy-dom omits.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

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

const fav = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/lib/stores/favoritesStore', () => ({
  useFavoritesStore: (selector: (s: { items: unknown[] }) => unknown) =>
    selector({ items: new Array(fav.count) }),
}));

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

beforeEach(() => {
  nav.pathname = '/';
  fav.count = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('<BottomNav />', () => {
  it('renders the brand and every primary destination on both surfaces', () => {
    render(<BottomNav />);
    expect(screen.getAllByRole('link', { name: 'aria_airwatch_home' })).toHaveLength(2);
    for (const label of ['nav_map', 'nav_search', 'nav_airports', 'nav_saved', 'nav_settings']) {
      expect(screen.getAllByRole('link', { name: label })).toHaveLength(2);
    }
  });

  it('marks only the home tab active on the index route', () => {
    nav.pathname = '/';
    render(<BottomNav />);
    expect(
      screen.getAllByRole('link', { name: 'nav_map' }).every((l) => l.getAttribute('aria-current') === 'page'),
    ).toBe(true);
    expect(
      screen.getAllByRole('link', { name: 'nav_search' }).some((l) => l.getAttribute('aria-current') === 'page'),
    ).toBe(false);
  });

  it('does not let the home prefix swallow other routes', () => {
    nav.pathname = '/search';
    render(<BottomNav />);
    // The "/" home link must NOT be active just because every path starts with "/".
    expect(
      screen.getAllByRole('link', { name: 'nav_map' }).some((l) => l.getAttribute('aria-current') === 'page'),
    ).toBe(false);
    expect(
      screen.getAllByRole('link', { name: 'nav_search' }).every((l) => l.getAttribute('aria-current') === 'page'),
    ).toBe(true);
  });

  it('treats a nested child route as active via the prefix match', () => {
    nav.pathname = '/airports/EDDF';
    render(<BottomNav />);
    expect(
      screen.getAllByRole('link', { name: 'nav_airports' }).every((l) => l.getAttribute('aria-current') === 'page'),
    ).toBe(true);
  });

  it('badges the saved tab with the favourites count', () => {
    fav.count = 3;
    render(<BottomNav />);
    expect(screen.getAllByLabelText('3 saved')).toHaveLength(2);
  });

  it('hides the favourites badge when nothing is saved', () => {
    fav.count = 0;
    render(<BottomNav />);
    expect(screen.queryByLabelText(/saved$/)).toBeNull();
  });

  it('synthesises the Cmd+K hotkey from the palette shortcut button', () => {
    const dispatch = vi.spyOn(document, 'dispatchEvent');
    render(<BottomNav />);
    fireEvent.click(screen.getByRole('button', { name: 'command_palette_open' }));
    const firedHotkey = dispatch.mock.calls.some(
      ([e]) => e instanceof KeyboardEvent && e.key === 'k' && e.metaKey,
    );
    expect(firedHotkey).toBe(true);
  });

  it('opens the More sheet from the nav and starts with it closed', () => {
    render(<BottomNav />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'nav_more' })[0]);
    expect(screen.getByRole('dialog', { name: 'nav_more' })).toBeInTheDocument();
  });

  it('lights the desktop More pill when a secondary route is active', () => {
    nav.pathname = '/cargo';
    render(<BottomNav />);
    const moreButtons = screen.getAllByRole('button', { name: 'nav_more' });
    const active = moreButtons.filter((b) => b.getAttribute('data-pill-active') === 'true');
    expect(active).toHaveLength(1);
  });
});
