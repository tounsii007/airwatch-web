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

  it('exposes role=status with a sr-only "Loading" announcement', () => {
    render(<LoadingRadar />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading');
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
