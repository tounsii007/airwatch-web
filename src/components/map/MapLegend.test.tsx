// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MAP_STYLES } from '@/components/map/mapStyles';
import { MapLegend } from './MapLegend';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

const swatches = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('span.rounded-full'));

describe('<MapLegend />', () => {
  it('renders a labelled altitude-legend list', () => {
    render(<MapLegend mapStyle="dark" />);
    const list = screen.getByRole('list', { name: 'aria_altitude_legend' });
    expect(list).toBeInTheDocument();
  });

  it('shows a row for each altitude band', () => {
    render(<MapLegend mapStyle="dark" />);
    expect(screen.getByText('legend_alt_low')).toBeInTheDocument();
    expect(screen.getByText('legend_alt_med')).toBeInTheDocument();
    expect(screen.getByText('legend_alt_high')).toBeInTheDocument();
    expect(screen.getByText('legend_alt_ground')).toBeInTheDocument();
  });

  it('keys the swatch palette to the active map style', () => {
    const { container } = render(<MapLegend mapStyle="dark" />);
    const dots = swatches(container);
    const { low, med, high, ground } = MAP_STYLES.dark.colors;
    const got = dots.map((d) => d.style.backgroundColor.toLowerCase());
    expect(got).toEqual([low, med, high, ground].map((c) => c.toLowerCase()));
  });

  it('repaints the swatches when the style changes', () => {
    const { container, rerender } = render(<MapLegend mapStyle="dark" />);
    const before = swatches(container).map((d) => d.style.backgroundColor.toLowerCase());
    rerender(<MapLegend mapStyle="streets" />);
    const after = swatches(container).map((d) => d.style.backgroundColor.toLowerCase());
    expect(after).not.toEqual(before);
    expect(after).toEqual(
      [
        MAP_STYLES.streets.colors.low,
        MAP_STYLES.streets.colors.med,
        MAP_STYLES.streets.colors.high,
        MAP_STYLES.streets.colors.ground,
      ].map((c) => c.toLowerCase()),
    );
  });

  it('has no axe violations', async () => {
    const { container } = render(<MapLegend mapStyle="dark" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
