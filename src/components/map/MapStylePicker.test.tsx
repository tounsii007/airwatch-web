// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MAP_STYLES, STYLE_ORDER } from '@/components/map/mapStyles';
import { MapStylePicker } from './MapStylePicker';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

const openPicker = () => fireEvent.click(screen.getByRole('button'));

describe('<MapStylePicker />', () => {
  it('starts collapsed with no popover', () => {
    render(<MapStylePicker mapStyle="dark" onChange={() => {}} />);
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens a listbox with one option per known style', () => {
    render(<MapStylePicker mapStyle="dark" onChange={() => {}} />);
    openPicker();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(STYLE_ORDER.length);
  });

  it('marks the current style as the selected option', () => {
    // STYLE_ORDER now exposes a single basemap (satellite), so the picker
    // renders exactly that option and marks it selected when it is current.
    render(<MapStylePicker mapStyle="satellite" onChange={() => {}} />);
    openPicker();
    const sat = screen.getByRole('option', { name: MAP_STYLES.satellite.label });
    expect(sat).toHaveAttribute('aria-selected', 'true');
  });

  it('reports the picked style and closes the popover', () => {
    const onChange = vi.fn();
    render(<MapStylePicker mapStyle="dark" onChange={onChange} />);
    openPicker();
    fireEvent.click(screen.getByRole('option', { name: MAP_STYLES.satellite.label }));
    expect(onChange).toHaveBeenCalledWith('satellite');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('previews each style with its high-altitude swatch colour', () => {
    render(<MapStylePicker mapStyle="dark" onChange={() => {}} />);
    openPicker();
    const sat = screen.getByRole('option', { name: MAP_STYLES.satellite.label });
    const swatch = sat.querySelector<HTMLElement>('span[aria-hidden]')!;
    expect(swatch.style.backgroundColor.toLowerCase()).toBe(
      MAP_STYLES.satellite.colors.high.toLowerCase(),
    );
  });

  it('closes on Escape', () => {
    render(<MapStylePicker mapStyle="dark" onChange={() => {}} />);
    openPicker();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes on an outside click', () => {
    render(<MapStylePicker mapStyle="dark" onChange={() => {}} />);
    openPicker();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('stays open when the click lands inside the picker', () => {
    render(<MapStylePicker mapStyle="dark" onChange={() => {}} />);
    openPicker();
    fireEvent.mouseDown(screen.getByRole('listbox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('has no axe violations while open', async () => {
    const { container } = render(<MapStylePicker mapStyle="dark" onChange={() => {}} />);
    openPicker();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
