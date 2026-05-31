// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';

const settings = vi.hoisted(() => ({ theme: 'dark' as 'dark' | 'light' | 'system' }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof settings) => unknown) => selector(settings),
}));

type MqHandler = (e: MediaQueryListEvent) => void;
function stubMatchMedia(initial: boolean) {
  const handlers = new Set<MqHandler>();
  const mql = {
    matches: initial,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: MqHandler) => handlers.add(cb),
    removeEventListener: (_: string, cb: MqHandler) => handlers.delete(cb),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return {
    handlerCount: () => handlers.size,
    emit: (matches: boolean) => {
      mql.matches = matches;
      act(() => handlers.forEach((h) => h({ matches } as MediaQueryListEvent)));
    },
  };
}

const html = () => document.documentElement;

beforeEach(() => {
  settings.theme = 'dark';
  html().classList.remove('dark', 'light');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<ThemeProvider />', () => {
  it('applies the dark class for an explicit dark theme', () => {
    settings.theme = 'dark';
    render(<ThemeProvider />);
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().classList.contains('light')).toBe(false);
  });

  it('applies the light class for an explicit light theme', () => {
    settings.theme = 'light';
    render(<ThemeProvider />);
    expect(html().classList.contains('light')).toBe(true);
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('follows the OS preference when set to system (dark)', () => {
    settings.theme = 'system';
    stubMatchMedia(true);
    render(<ThemeProvider />);
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('follows the OS preference when set to system (light)', () => {
    settings.theme = 'system';
    stubMatchMedia(false);
    render(<ThemeProvider />);
    expect(html().classList.contains('light')).toBe(true);
  });

  it('reacts to OS preference changes while on system', () => {
    settings.theme = 'system';
    const mq = stubMatchMedia(false);
    render(<ThemeProvider />);
    expect(html().classList.contains('light')).toBe(true);
    mq.emit(true);
    expect(html().classList.contains('dark')).toBe(true);
    mq.emit(false);
    expect(html().classList.contains('light')).toBe(true);
  });

  it('detaches the media listener on unmount', () => {
    settings.theme = 'system';
    const mq = stubMatchMedia(false);
    const { unmount } = render(<ThemeProvider />);
    expect(mq.handlerCount()).toBe(1);
    unmount();
    expect(mq.handlerCount()).toBe(0);
  });

  it('renders no DOM of its own', () => {
    const { container } = render(<ThemeProvider />);
    expect(container).toBeEmptyDOMElement();
  });
});
