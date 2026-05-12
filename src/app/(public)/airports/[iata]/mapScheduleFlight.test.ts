import { describe, expect, it } from 'vitest';
import { formatScheduleTime, mapScheduleFlight } from './mapScheduleFlight';

/**
 * Verbatim shape from the user's Airlabs spec dump (see Iter 10 prompt) —
 * a real schedules-by-arr_iata=AMS row with codeshare info, gate/terminal,
 * delay minutes and the {@code dep_estimated} fallback the mapper must
 * pick up when {@code dep_time} is missing.
 */
const RAW_AIRLABS_ROW = {
  airline_iata: 'AF',
  airline_icao: 'AFR',
  flight_iata: 'AF1241',
  flight_icao: 'AFR1241',
  flight_number: '1241',
  dep_iata: 'CDG',
  dep_icao: 'LFPG',
  dep_terminal: '2F',
  dep_gate: 'F32',
  dep_time: '2026-05-11 11:30',
  dep_estimated: '2026-05-11 11:35',
  arr_iata: 'AMS',
  arr_icao: 'EHAM',
  arr_terminal: '2',
  arr_gate: 'D54',
  arr_time: '2026-05-11 12:50',
  arr_estimated: null,
  cs_airline_iata: 'KL',
  cs_flight_iata: 'KL2002',
  cs_flight_number: 2002,
  status: 'scheduled',
  delayed: 5,
  arr_delayed: null,
};

describe('mapScheduleFlight', () => {
  it('maps the canonical Airlabs schedule shape into our typed model', () => {
    const out = mapScheduleFlight(RAW_AIRLABS_ROW);

    expect(out.flightIata).toBe('AF1241');
    expect(out.flightIcao).toBe('AFR1241');
    expect(out.airlineIata).toBe('AF');
    expect(out.depIata).toBe('CDG');
    expect(out.arrIata).toBe('AMS');
    expect(out.depTerminal).toBe('2F');
    expect(out.depGate).toBe('F32');
    expect(out.arrTerminal).toBe('2');
    expect(out.arrGate).toBe('D54');
    expect(out.depTime).toBe('2026-05-11 11:30');
    expect(out.arrTime).toBe('2026-05-11 12:50');
    expect(out.depDelayed).toBe(5);
    expect(out.arrDelayed).toBeUndefined();
    expect(out.status).toBe('scheduled');
  });

  it('captures codeshare partner identity (cs_airline_iata + cs_flight_iata)', () => {
    const out = mapScheduleFlight(RAW_AIRLABS_ROW);

    // The headline number for the partner brand — what the badge renders.
    expect(out.csAirlineIata).toBe('KL');
    expect(out.csFlightIata).toBe('KL2002');
    // cs_flight_number arrives as a JSON number — the mapper coerces to string
    // so the UI never has to do {String(x)} switchovers.
    expect(out.csFlightNumber).toBe('2002');
  });

  it('omits codeshare fields when upstream did not include them', () => {
    const noCs = { ...RAW_AIRLABS_ROW };
    delete (noCs as Record<string, unknown>).cs_airline_iata;
    delete (noCs as Record<string, unknown>).cs_flight_iata;
    delete (noCs as Record<string, unknown>).cs_flight_number;

    const out = mapScheduleFlight(noCs);

    expect(out.csAirlineIata).toBeUndefined();
    expect(out.csFlightIata).toBeUndefined();
    expect(out.csFlightNumber).toBeUndefined();
    // Operating-flight fields stay populated — codeshare is purely additive.
    expect(out.flightIata).toBe('AF1241');
  });

  it('falls back to dep_estimated/arr_estimated when scheduled time is absent', () => {
    const out = mapScheduleFlight({
      flight_iata: 'XX1',
      dep_iata: 'TUN',
      arr_iata: 'AMS',
      dep_estimated: '2026-05-11 09:15',
      arr_estimated: '2026-05-11 12:30',
    });

    expect(out.depTime).toBe('2026-05-11 09:15');
    expect(out.arrTime).toBe('2026-05-11 12:30');
  });

  it('treats numeric "delayed=0" as on-time, not "delayed=undefined"', () => {
    // Subtle: 0 must round-trip to 0, not get coerced to undefined by the
    // != null guard — the row should render as "On Time" not "—".
    const out = mapScheduleFlight({
      flight_iata: 'XX2', dep_iata: 'A', arr_iata: 'B', delayed: 0,
    });

    expect(out.depDelayed).toBe(0);
  });
});

describe('formatScheduleTime', () => {
  it('extracts HH:MM from a full-date Airlabs timestamp', () => {
    expect(formatScheduleTime('2026-05-11 12:50')).toBe('12:50');
  });

  it('renders a placeholder for missing values instead of crashing', () => {
    expect(formatScheduleTime(undefined)).toBe('--:--');
  });
});
