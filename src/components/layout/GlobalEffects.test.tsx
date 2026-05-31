// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { GlobalEffects } from './GlobalEffects';

// Cross-page subscriptions are out of scope here — neutralise them.
vi.mock('@/lib/hooks/useGeoFenceAlerts', () => ({ useGeoFenceAlerts: vi.fn() }));
vi.mock('@/lib/hooks/useGeoFenceToasts', () => ({ useGeoFenceToasts: vi.fn() }));

const vis = vi.hoisted(() => ({ visible: true }));
vi.mock('@/lib/hooks/usePageVisibility', () => ({ usePageVisibility: () => vis.visible }));

const loaders = vi.hoisted(() => ({ loadAirports: vi.fn(() => Promise.resolve()), loadCityI18n: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/data/airports', () => ({ loadAirports: loaders.loadAirports }));
vi.mock('@/lib/data/city-translations', () => ({ loadCityI18n: loaders.loadCityI18n }));

const settings = vi.hoisted(() => ({ language: 'en' }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof settings) => unknown) => selector(settings),
}));

const html = () => document.documentElement;

beforeEach(() => {
  vis.visible = true;
  settings.language = 'en';
  loaders.loadAirports.mockClear();
  loaders.loadCityI18n.mockClear();
  html().removeAttribute('lang');
  html().removeAttribute('dir');
  delete html().dataset.pageVisible;
});
afterEach(() => cleanup());

describe('<GlobalEffects />', () => {
  it('warms the airport + city caches once on mount', () => {
    render(<GlobalEffects />);
    expect(loaders.loadAirports).toHaveBeenCalledTimes(1);
    expect(loaders.loadCityI18n).toHaveBeenCalledTimes(1);
  });

  it('syncs <html lang> and an LTR dir for a left-to-right language', () => {
    settings.language = 'en';
    render(<GlobalEffects />);
    expect(html().getAttribute('lang')).toBe('en');
    expect(html().getAttribute('dir')).toBe('ltr');
  });

  it('flips dir to RTL for Arabic', () => {
    settings.language = 'ar';
    render(<GlobalEffects />);
    expect(html().getAttribute('lang')).toBe('ar');
    expect(html().getAttribute('dir')).toBe('rtl');
  });

  it('re-syncs lang + dir when the language changes', () => {
    settings.language = 'en';
    const { rerender } = render(<GlobalEffects />);
    expect(html().getAttribute('dir')).toBe('ltr');
    settings.language = 'ar';
    rerender(<GlobalEffects />);
    expect(html().getAttribute('lang')).toBe('ar');
    expect(html().getAttribute('dir')).toBe('rtl');
  });

  it('mirrors a visible page onto the data attribute', () => {
    vis.visible = true;
    render(<GlobalEffects />);
    expect(html().dataset.pageVisible).toBe('true');
  });

  it('mirrors a hidden page onto the data attribute', () => {
    vis.visible = false;
    render(<GlobalEffects />);
    expect(html().dataset.pageVisible).toBe('false');
  });

  it('renders nothing', () => {
    const { container } = render(<GlobalEffects />);
    expect(container).toBeEmptyDOMElement();
  });
});
