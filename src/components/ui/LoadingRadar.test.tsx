// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingRadar } from '@/components/ui/LoadingRadar';

describe('<LoadingRadar />', () => {
  it('renders the default brand label and hint', () => {
    render(<LoadingRadar />);
    expect(screen.getByText('AIRWATCH')).toBeInTheDocument();
    expect(screen.getByText('INITIALIZING FLIGHT SYSTEMS')).toBeInTheDocument();
  });

  it('exposes role=status with a sr-only loading announcement', () => {
    render(<LoadingRadar />);
    const status = screen.getByRole('status');
    // Default locale (en) renders the sr-only as "LOADING" — the announcement
    // travels through i18n now so screen readers see the localised string.
    expect(status).toHaveTextContent('LOADING');
  });

  it('renders a custom label and hint when provided', () => {
    render(<LoadingRadar label="WARMING UP" hint="Tile layer mounting" />);
    expect(screen.getByText('WARMING UP')).toBeInTheDocument();
    expect(screen.getByText('Tile layer mounting')).toBeInTheDocument();
  });

  it('omits the caption block when label and hint are both empty', () => {
    render(<LoadingRadar label={null} hint={null} />);
    expect(screen.queryByText('AIRWATCH')).not.toBeInTheDocument();
    expect(screen.queryByText('INITIALIZING FLIGHT SYSTEMS')).not.toBeInTheDocument();
  });
});
