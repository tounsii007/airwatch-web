// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarbonFootprintCard } from '@/components/flight/details/cards/CarbonFootprintCard';

// CarbonFootprintCard promotes the former <Co2Footer /> body into a titled
// glass card. These assertions mirror Co2Footer.test.tsx so the migrated
// content keeps the same coverage, plus the new "CARBON FOOTPRINT" heading.
describe('<CarbonFootprintCard />', () => {
  it('renders the section heading', () => {
    render(<CarbonFootprintCard language="en" co2Estimate={{ co2Kg: 120, distKm: 1500 }} copied={false} onShare={() => {}} />);
    expect(screen.getByText('CARBON FOOTPRINT')).toBeInTheDocument();
  });

  it('renders the CO2 estimate when provided', () => {
    render(<CarbonFootprintCard language="en" co2Estimate={{ co2Kg: 120, distKm: 1500 }} copied={false} onShare={() => {}} />);
    expect(screen.getByText('~120 kg CO2')).toBeInTheDocument();
    // happy-dom's Intl varies by locale — just look for the distance token.
    expect(screen.getByText(/1[\s,.]?500 km/)).toBeInTheDocument();
  });

  it('falls back to the unavailable label when estimate is missing', () => {
    render(<CarbonFootprintCard language="en" co2Estimate={null} copied={false} onShare={() => {}} />);
    // i18n-Key co2_unavailable → EN "Route unknown"
    expect(screen.getByText('Route unknown')).toBeInTheDocument();
  });

  it('swaps icon/text between Share and copied states', () => {
    const { rerender } = render(<CarbonFootprintCard language="en" co2Estimate={null} copied={false} onShare={() => {}} />);
    expect(screen.getByRole('button').textContent?.toLowerCase()).not.toContain('cop');

    rerender(<CarbonFootprintCard language="en" co2Estimate={null} copied={true} onShare={() => {}} />);
    expect(screen.getByRole('button').textContent?.toLowerCase()).toMatch(/cop(ied|i)/);
  });

  it('fires onShare when the button is clicked', async () => {
    const onShare = vi.fn();
    render(<CarbonFootprintCard language="en" co2Estimate={{ co2Kg: 1, distKm: 1 }} copied={false} onShare={onShare} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onShare).toHaveBeenCalledOnce();
  });
});
