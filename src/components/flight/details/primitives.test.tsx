// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { FlightRouteInfo } from '@/lib/types';
import {
  DataCell,
  FlagAirport,
  MiniCell,
  Tag as FlightTag,
  TimesRow,
} from './primitives';

describe('flight detail primitives', () => {
  describe('<FlagAirport />', () => {
    it('renders the IATA code, city, and country', () => {
      render(
        <FlagAirport iata="FRA" city="Frankfurt" country="Germany" color="var(--info)" />,
      );
      expect(screen.getByText('FRA')).toBeInTheDocument();
      expect(screen.getByText('Frankfurt')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
    });

    it('tints the code with the supplied colour', () => {
      render(<FlagAirport iata="JFK" color="var(--success)" />);
      expect(screen.getByText('JFK').style.color).toBe('var(--success)');
    });

    it('falls back to a placeholder when no code is given', () => {
      render(<FlagAirport color="var(--info)" />);
      expect(screen.getByText('---')).toBeInTheDocument();
    });
  });

  describe('<FlightTag />', () => {
    it('renders the label and value', () => {
      render(<FlightTag label="ALT" value="36000" />);
      expect(screen.getByText('ALT')).toBeInTheDocument();
      expect(screen.getByText('36000')).toBeInTheDocument();
    });

    it('applies the error accent when highlighted', () => {
      render(<FlightTag label="WARN" value="STALL" highlight />);
      expect(screen.getByText('STALL').className).toContain('--error');
    });
  });

  describe('<MiniCell /> & <DataCell />', () => {
    it('MiniCell renders its label and ticking value', () => {
      render(<MiniCell label="SPD" value="450" />);
      expect(screen.getByText('SPD')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
    });

    it('DataCell renders an icon, label, and value', () => {
      render(
        <DataCell icon={<i data-testid="cell-icon" />} label="HDG" value="270" />,
      );
      expect(screen.getByTestId('cell-icon')).toBeInTheDocument();
      expect(screen.getByText('HDG')).toBeInTheDocument();
      expect(screen.getByText('270')).toBeInTheDocument();
    });
  });

  describe('<TimesRow />', () => {
    const routeInfo: FlightRouteInfo = {
      scheduledDep: '2026-05-30T08:15:00Z',
      scheduledArr: '2026-05-30T11:45:00Z',
      status: 'EN_ROUTE',
    } as FlightRouteInfo;

    it('extracts the HH:MM portion of the scheduled times', () => {
      render(<TimesRow routeInfo={routeInfo} />);
      expect(screen.getByText('08:15')).toBeInTheDocument();
      expect(screen.getByText('11:45')).toBeInTheDocument();
    });

    it('shows placeholders when the times are missing', () => {
      render(<TimesRow routeInfo={{ status: 'SCHEDULED' } as FlightRouteInfo} />);
      expect(screen.getAllByText('--:--')).toHaveLength(2);
    });

    it('surfaces departure and arrival delays', () => {
      render(
        <TimesRow
          routeInfo={{ ...routeInfo, depDelayed: 12, arrDelayed: 5 } as FlightRouteInfo}
        />,
      );
      expect(screen.getByText('+12min')).toBeInTheDocument();
      expect(screen.getByText('+5min')).toBeInTheDocument();
    });

    it('renders terminal / gate / baggage detail when present', () => {
      render(
        <TimesRow
          routeInfo={
            {
              ...routeInfo,
              depTerminal: '1',
              depGate: 'A12',
              arrTerminal: '2',
              arrBaggage: '7',
            } as FlightRouteInfo
          }
        />,
      );
      expect(screen.getByText('T1 / Gate A12')).toBeInTheDocument();
      expect(screen.getByText('T2 / Bag 7')).toBeInTheDocument();
    });
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <TimesRow
        routeInfo={
          {
            scheduledDep: '2026-05-30T08:15:00Z',
            scheduledArr: '2026-05-30T11:45:00Z',
            status: 'EN_ROUTE',
          } as FlightRouteInfo
        }
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
