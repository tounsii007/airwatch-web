// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * DestinationWeatherCard renders LIVE weather at the flight's arrival airport.
 * It resolves `arrIata` → coords via {@link airportCoords} and fetches the
 * current conditions through {@link apiFetch}(API.weather(...)).
 *
 * These tests pin the contract the card's doc-comment promises:
 *   (a) when the IATA resolves to coords AND the fetch yields a usable
 *       `current` payload, the temperature + condition are shown;
 *   (b) when the IATA is absent, has no coords, or the fetch fails/empties,
 *       the card shows the HONEST "unavailable" line — never `0°`, never a
 *       blank temperature.
 *
 * We mock only the two seams the card reaches across — the coords lookup and
 * the fetch client — so the real `API.weather` URL builder and the real
 * emoji/label utils stay in the path (a field can only render if it's real).
 */

const airportCoordsMock = vi.fn<(iata: string) => { lat: number; lon: number } | null>();
const apiFetchMock = vi.fn();

vi.mock('@/lib/data/airports', () => ({
  airportCoords: (iata: string) => airportCoordsMock(iata),
}));

vi.mock('@/lib/apiFetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

// Imported AFTER vi.mock so the component picks up the mocked modules.
import { DestinationWeatherCard } from './DestinationWeatherCard';

/** A Response-like stub matching what the card consumes: `.ok` + `.json()`. */
function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response;
}

/** Open-Meteo proxy `current` block as the backend actually returns it. */
const FRA_CURRENT = {
  temperature_2m: 18.6,
  wind_speed_10m: 12.4,
  weather_code: 61, // WMO rain → EN label "Rain"
  is_day: 1,
  relative_humidity_2m: 72,
};

describe('<DestinationWeatherCard />', () => {
  beforeEach(() => {
    airportCoordsMock.mockReset();
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always renders the locale-neutral heading', () => {
    airportCoordsMock.mockReturnValue(null);
    render(<DestinationWeatherCard arrIata={undefined} language="en" />);
    expect(screen.getByText('WEATHER AT DESTINATION')).toBeInTheDocument();
  });

  // (a) coords resolve + fetch resolves with data → real reading shown.
  it('renders temperature and condition when arrIata resolves and the fetch returns data', async () => {
    airportCoordsMock.mockReturnValue({ lat: 50.03, lon: 8.57 });
    apiFetchMock.mockResolvedValue(jsonResponse({ current: FRA_CURRENT }));

    render(<DestinationWeatherCard arrIata="FRA" language="en" />);

    // Temperature is rounded and suffixed °C (18.6 → 19).
    expect(await screen.findByText('19°C')).toBeInTheDocument();
    // Condition label comes from the real getWeatherLabel(61, 'en') === 'Rain'.
    expect(screen.getByText('Rain')).toBeInTheDocument();
    // The honest "unavailable" line must NOT be present in the success state.
    expect(screen.queryByText('Weather unavailable')).not.toBeInTheDocument();

    // Coords were resolved from the IATA and the weather endpoint was hit
    // with those coords baked into the URL (real API.weather builder).
    expect(airportCoordsMock).toHaveBeenCalledWith('FRA');
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const url = apiFetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/weather/50.03/8.57');
  });

  it('also renders the real wind and humidity chips when present', async () => {
    airportCoordsMock.mockReturnValue({ lat: 50.03, lon: 8.57 });
    apiFetchMock.mockResolvedValue(jsonResponse({ current: FRA_CURRENT }));

    render(<DestinationWeatherCard arrIata="FRA" language="en" />);

    expect(await screen.findByText('12 km/h')).toBeInTheDocument(); // 12.4 → 12
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  // (b) honest "unavailable" — and crucially NOT 0°/blank — across every
  // failure mode the card promises to gate.

  it('shows "unavailable" (not 0°) when arrIata is undefined — never touches the fetch', async () => {
    airportCoordsMock.mockReturnValue(null);

    render(<DestinationWeatherCard arrIata={undefined} language="en" />);

    expect(await screen.findByText('Weather unavailable')).toBeInTheDocument();
    // No fabricated reading: no temperature at all, not a 0°.
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0°/)).not.toBeInTheDocument();
    // With no IATA the card must not reach the network.
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('shows "unavailable" (not 0°) when the IATA has no known coords', async () => {
    airportCoordsMock.mockReturnValue(null); // unknown airport

    render(<DestinationWeatherCard arrIata="ZZZ" language="en" />);

    expect(await screen.findByText('Weather unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('shows "unavailable" (not 0°) when coords are present but zeroed/falsy', async () => {
    // lat/lon of 0 are treated as "unknown" by the card's `!coords.lat` gate.
    airportCoordsMock.mockReturnValue({ lat: 0, lon: 0 });

    render(<DestinationWeatherCard arrIata="NUL" language="en" />);

    expect(await screen.findByText('Weather unavailable')).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('shows "unavailable" (not 0°) when the fetch rejects', async () => {
    airportCoordsMock.mockReturnValue({ lat: 50.03, lon: 8.57 });
    apiFetchMock.mockRejectedValue(new Error('offline'));

    render(<DestinationWeatherCard arrIata="FRA" language="en" />);

    expect(await screen.findByText('Weather unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
  });

  it('shows "unavailable" (not 0°) on a non-ok HTTP response', async () => {
    airportCoordsMock.mockReturnValue({ lat: 50.03, lon: 8.57 });
    apiFetchMock.mockResolvedValue(jsonResponse({ current: FRA_CURRENT }, /* ok */ false));

    render(<DestinationWeatherCard arrIata="FRA" language="en" />);

    expect(await screen.findByText('Weather unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
  });

  it('shows "unavailable" (not 0°) when the payload lacks a `current` block', async () => {
    airportCoordsMock.mockReturnValue({ lat: 50.03, lon: 8.57 });
    apiFetchMock.mockResolvedValue(jsonResponse({})); // no `current`

    render(<DestinationWeatherCard arrIata="FRA" language="en" />);

    expect(await screen.findByText('Weather unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
  });

  it('stays in the "unavailable" state and does not flash a reading on an empty body', async () => {
    airportCoordsMock.mockReturnValue({ lat: 50.03, lon: 8.57 });
    apiFetchMock.mockResolvedValue(jsonResponse(null));

    render(<DestinationWeatherCard arrIata="FRA" language="en" />);

    // Give the async effect a beat to settle, then confirm it never rendered a temp.
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(screen.getByText('Weather unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
  });
});
