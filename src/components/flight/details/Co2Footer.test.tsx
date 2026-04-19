// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Co2Footer } from '@/components/flight/details/Co2Footer';

describe('<Co2Footer />', () => {
  it('renders the CO2 estimate when provided', () => {
    render(<Co2Footer language="en" co2Estimate={{ co2Kg: 120, distKm: 1500 }} copied={false} onShare={() => {}} />);
    expect(screen.getByText('~120 kg CO2')).toBeInTheDocument();
    // happy-dom's Intl varies by locale — just look for the distance token.
    expect(screen.getByText(/1[\s,.]?500 km/)).toBeInTheDocument();
  });

  it('falls back to the unavailable label when estimate is missing', () => {
    render(<Co2Footer language="en" co2Estimate={null} copied={false} onShare={() => {}} />);
    // i18n-Key co2_unavailable → EN "Route unknown"
    expect(screen.getByText('Route unknown')).toBeInTheDocument();
  });

  it('swaps icon/text between Share and copied states', () => {
    const { rerender } = render(<Co2Footer language="en" co2Estimate={null} copied={false} onShare={() => {}} />);
    expect(screen.getByRole('button').textContent?.toLowerCase()).not.toContain('cop');

    rerender(<Co2Footer language="en" co2Estimate={null} copied={true} onShare={() => {}} />);
    expect(screen.getByRole('button').textContent?.toLowerCase()).toMatch(/cop(ied|i)/);
  });

  it('fires onShare when the button is clicked', async () => {
    const onShare = vi.fn();
    render(<Co2Footer language="en" co2Estimate={{ co2Kg: 1, distKm: 1 }} copied={false} onShare={onShare} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onShare).toHaveBeenCalledOnce();
  });
});
