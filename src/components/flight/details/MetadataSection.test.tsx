// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AircraftMetadata } from '@/lib/types';
import { MetadataSection } from './MetadataSection';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

const full: AircraftMetadata = {
  manufacturer: 'Boeing',
  model: '737-800',
  typecode: 'B738',
  operatorName: 'Lufthansa',
  registration: 'D-ABCD',
  built: 1998,
  age: 12,
  engine: 'turbofan',
  engineCount: 2,
  msn: '28000',
} as AircraftMetadata;

describe('<MetadataSection />', () => {
  it('renders the manufacturer and model', () => {
    render(<MetadataSection metadata={full} icao24="3c6444" language="en" />);
    expect(screen.getByText('Boeing 737-800')).toBeInTheDocument();
  });

  it('renders the typecode as both a UI tag and a TYPE chip', () => {
    render(<MetadataSection metadata={full} icao24="3c6444" language="en" />);
    expect(screen.getAllByText('B738')).toHaveLength(2);
  });

  it('shows the operator line', () => {
    render(<MetadataSection metadata={full} icao24="3c6444" language="en" />);
    expect(screen.getByText('operated_by Lufthansa')).toBeInTheDocument();
  });

  it('omits the operator line when no operator is known', () => {
    render(
      <MetadataSection
        metadata={{ ...full, operatorName: undefined } as AircraftMetadata}
        icao24="3c6444"
        language="en"
      />,
    );
    expect(screen.queryByText(/operated_by/)).toBeNull();
  });

  it('upper-cases the ICAO24 hex', () => {
    render(<MetadataSection metadata={full} icao24="3c6444" language="en" />);
    expect(screen.getByText('3C6444')).toBeInTheDocument();
  });

  it('renders the registration and MSN chips', () => {
    render(<MetadataSection metadata={full} icao24="3c6444" language="en" />);
    expect(screen.getByText('D-ABCD')).toBeInTheDocument();
    expect(screen.getByText('28000')).toBeInTheDocument();
  });

  it('composes the engine count and type', () => {
    render(<MetadataSection metadata={full} icao24="3c6444" language="en" />);
    expect(screen.getByText('2× turbofan')).toBeInTheDocument();
  });

  it('renders the build year and age', () => {
    render(<MetadataSection metadata={full} icao24="3c6444" language="en" />);
    expect(screen.getByText('1998')).toBeInTheDocument();
    expect(screen.getByText('12 years_short')).toBeInTheDocument();
  });

  it('falls back to the engine type alone when the count is unknown', () => {
    render(
      <MetadataSection
        metadata={{ ...full, engineCount: undefined } as AircraftMetadata}
        icao24="3c6444"
        language="en"
      />,
    );
    expect(screen.getByText('turbofan')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <MetadataSection metadata={full} icao24="3c6444" language="en" />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
