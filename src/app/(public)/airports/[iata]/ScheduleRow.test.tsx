// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScheduleRow } from './ScheduleRow';
import type { AirportScheduleFlight } from '@/lib/types';

// next/link triggers router lookups in tests — stub it to a plain anchor so
// we can render ScheduleRow without wrapping in an App Router test harness.
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const BASE: AirportScheduleFlight = {
  flightIcao: 'AFR1241',
  flightIata: 'AF1241',
  airlineIata: 'AF',
  depIata: 'CDG',
  arrIata: 'AMS',
  depTime: '2026-05-11 11:30',
  arrTime: '2026-05-11 12:50',
  status: 'scheduled',
};

describe('ScheduleRow codeshare rendering', () => {
  it('renders the codeshare badge with the partner flight number when present', () => {
    render(<ScheduleRow tab="arrivals" language="en" flight={{
      ...BASE,
      csAirlineIata: 'KL',
      csFlightIata: 'KL2002',
      csFlightNumber: '2002',
    }} />);

    // Badge label + partner number must both be visible.
    expect(screen.getByText('CS')).toBeTruthy();
    expect(screen.getByText('KL2002')).toBeTruthy();
  });

  it('omits the badge entirely when no codeshare info is present', () => {
    render(<ScheduleRow tab="arrivals" language="en" flight={BASE} />);

    // The "CS" pill must not appear — the row should be visually unchanged
    // from rows without codeshare. (The string "CS" elsewhere in copy would
    // be a regression worth knowing about, so we check by absence.)
    expect(screen.queryByText('CS')).toBeNull();
  });

  it('suppresses self-codeshare (partner number identical to operating)', () => {
    // Edge case from the wild: some upstream rows fill cs_flight_iata with
    // the same number as flight_iata. That's not a real codeshare — don't
    // render a badge that says "AF1241 codeshares with AF1241".
    render(<ScheduleRow tab="arrivals" language="en" flight={{
      ...BASE,
      csAirlineIata: 'AF',
      csFlightIata: 'AF1241',
      csFlightNumber: '1241',
    }} />);

    expect(screen.queryByText('CS')).toBeNull();
  });

  it('falls back to airline+number when only those fields are present (cs_flight_iata missing)', () => {
    render(<ScheduleRow tab="arrivals" language="en" flight={{
      ...BASE,
      csAirlineIata: 'KL',
      csFlightNumber: '2002',
      // csFlightIata intentionally omitted — mapper should still produce a badge.
    }} />);

    expect(screen.getByText('CS')).toBeTruthy();
    expect(screen.getByText('KL2002')).toBeTruthy();
  });
});
