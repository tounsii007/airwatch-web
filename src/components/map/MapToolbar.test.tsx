// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MapToolbar } from './MapToolbar';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

function renderToolbar(
  overrides: Partial<React.ComponentProps<typeof MapToolbar>> = {},
) {
  const props = {
    language: 'en' as const,
    mapStyle: 'dark' as const,
    onMapStyle: vi.fn(),
    showRadar: false,
    radarShouldShow: true,
    onToggleRadar: vi.fn(),
    cargoOnly: false,
    onToggleCargo: vi.fn(),
    showLegend: false,
    onToggleLegend: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onCenter: vi.fn(),
    ...overrides,
  };
  const utils = render(<MapToolbar {...props} />);
  return { ...utils, props };
}

describe('<MapToolbar />', () => {
  it('is a labelled toolbar', () => {
    renderToolbar();
    expect(
      screen.getByRole('toolbar', { name: 'aria_map_controls' }),
    ).toBeInTheDocument();
  });

  it('wires the zoom and centre controls to their callbacks', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'aria_zoom_in' }));
    fireEvent.click(screen.getByRole('button', { name: 'aria_zoom_out' }));
    fireEvent.click(screen.getByRole('button', { name: 'aria_reset_view' }));
    expect(props.onZoomIn).toHaveBeenCalledTimes(1);
    expect(props.onZoomOut).toHaveBeenCalledTimes(1);
    expect(props.onCenter).toHaveBeenCalledTimes(1);
  });

  it('labels the radar toggle by state and reports clicks', () => {
    const { props } = renderToolbar({ showRadar: false });
    const button = screen.getByRole('button', { name: 'Show weather radar' });
    fireEvent.click(button);
    expect(props.onToggleRadar).toHaveBeenCalledTimes(1);
  });

  it('flips the radar label to "Hide" when active and presses the toggle', () => {
    renderToolbar({ showRadar: true });
    const button = screen.getByRole('button', { name: 'Hide weather radar' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('dims the radar icon when it is on but suppressed at the current zoom', () => {
    renderToolbar({ showRadar: true, radarShouldShow: false });
    const button = screen.getByRole('button', { name: 'Hide weather radar' });
    expect(button.querySelector('svg')?.getAttribute('class')).toContain('opacity-40');
  });

  it('labels and toggles the cargo-only filter', () => {
    const { props } = renderToolbar({ cargoOnly: false });
    fireEvent.click(screen.getByRole('button', { name: 'cargo_only_on' }));
    expect(props.onToggleCargo).toHaveBeenCalledTimes(1);
  });

  it('shows the cargo toggle as pressed when the filter is on', () => {
    renderToolbar({ cargoOnly: true });
    expect(
      screen.getByRole('button', { name: 'cargo_only_off' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels and toggles the legend control', () => {
    const { props } = renderToolbar({ showLegend: false });
    fireEvent.click(screen.getByRole('button', { name: 'Show legend' }));
    expect(props.onToggleLegend).toHaveBeenCalledTimes(1);
  });

  it('embeds the map-style picker', () => {
    renderToolbar();
    // The picker's collapsed toggle exposes a listbox popup.
    expect(
      screen.getByRole('button', { name: 'aria_map_style_label' }),
    ).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('has no axe violations', async () => {
    const { container } = renderToolbar();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
