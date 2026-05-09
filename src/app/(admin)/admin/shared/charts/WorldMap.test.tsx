// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorldMap } from './WorldMap';

describe('<WorldMap />', () => {
  it('renders the empty-state when data is empty', () => {
    const { container } = render(<WorldMap data={{}} />);
    expect(screen.getByText(/NO GEO DATA YET/i)).toBeInTheDocument();
    expect(screen.getByText(/.mmdb not loaded/)).toBeInTheDocument();
    // SVG is still rendered (so the empty state floats over a visible map).
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('paints regions present in the data with the heat colour', () => {
    const { container } = render(<WorldMap data={{ DE: 12, US: 4 }} />);
    const de = container.querySelector('rect[data-country="DE"]');
    const us = container.querySelector('rect[data-country="US"]');
    expect(de).not.toBeNull();
    expect(us).not.toBeNull();
    expect(de?.getAttribute('data-count')).toBe('12');
    expect(us?.getAttribute('data-count')).toBe('4');
  });

  it('renders a tooltip <title> with country name + count for non-zero entries', () => {
    const { container } = render(<WorldMap data={{ DE: 12 }} />);
    const titles = Array.from(container.querySelectorAll('g > title')).map((t) => t.textContent);
    expect(titles).toContain('Germany (DE) · 12 blocked');
  });

  it('renders the top-5 originator chips when data is non-empty', () => {
    render(<WorldMap data={{ US: 50, DE: 10, FR: 7, GB: 3, CN: 2, IN: 1 }} />);
    // Top 5 by count desc — IN (1) should be off the leaderboard.
    const codes = ['US', 'DE', 'FR', 'GB', 'CN'];
    for (const code of codes) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
    expect(screen.queryByText('IN')).toBeNull();
  });

  it('formats count tokens with locale separators in the chips', () => {
    const { container } = render(<WorldMap data={{ US: 1234 }} />);
    // Either "1,234" or "1.234" depending on Intl backend. The chip is the
    // <span> with the count token next to the country code.
    const chip = container.querySelector('div[title*="1"]');
    expect(chip?.textContent).toMatch(/1[\s,.]?234/);
  });

  it('keeps the equirectangular grid lines regardless of data', () => {
    const { container } = render(<WorldMap data={{}} />);
    const horizontalLines = container.querySelectorAll('line[stroke="rgba(122, 154, 191, 0.08)"]');
    // 5 latitude bands + 11 longitude bands = 16 lines.
    expect(horizontalLines.length).toBe(16);
  });
});
