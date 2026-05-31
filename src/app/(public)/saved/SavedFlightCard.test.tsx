// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SavedFlightCard } from './SavedFlightCard';
import type { AircraftState, FavoriteItem } from '@/lib/types';

// Heavy reference-data modules → deterministic stubs.
vi.mock('@/lib/data/airlines', () => ({
  resolveAirline: () => ({ iata: 'LH', name: 'Lufthansa' }),
  getAirlineLogoUrl: (iata: string) => `/logos/${iata}.png`,
}));
vi.mock('@/lib/data/airports', () => ({
  airportCity: (iata: string) => (iata === 'FRA' ? 'Frankfurt' : iata === 'JFK' ? 'New York' : ''),
}));
vi.mock('@/lib/data/city-translations', () => ({ localizeCity: (c: string) => c }));
vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

const makeItem = (over: Partial<FavoriteItem> = {}): FavoriteItem => ({
  id: 'abc123', type: 'flight', label: 'DLH456', addedAt: 1_700_000_000_000,
  pinned: false, airlineName: 'Lufthansa', airlineIata: 'LH',
  depIata: 'FRA', arrIata: 'JFK', originCountry: 'DE', ...over,
});
const makeAc = (over: Partial<AircraftState> = {}): AircraftState => ({
  icao24: 'abc123', onGround: false, category: 0, lastUpdate: 0,
  baroAltitude: 10_000, velocity: 230, depIata: 'FRA', arrIata: 'JFK', originCountry: 'DE', ...over,
});

function renderCard(opts: { item?: Partial<FavoriteItem>; live?: AircraftState | undefined } = {}) {
  const onRemove = vi.fn(), onPin = vi.fn(), onTrack = vi.fn();
  const utils = render(
    <SavedFlightCard
      item={makeItem(opts.item)}
      liveData={'live' in opts ? opts.live : undefined}
      language="en"
      altitudeUnit="feet"
      speedUnit="knots"
      onRemove={onRemove}
      onPin={onPin}
      onTrack={onTrack}
    />,
  );
  return { ...utils, onRemove, onPin, onTrack };
}

/** The two click-to-track regions carry an explicit role="button". */
const trackRegions = (c: HTMLElement) => Array.from(c.querySelectorAll('[role="button"]'));

afterEach(() => cleanup());

describe('<SavedFlightCard />', () => {
  it('derives the display callsign from the airline IATA and flight number', () => {
    renderCard();
    expect(screen.getByText('LH456')).toBeInTheDocument();
    expect(screen.getByText('Lufthansa')).toBeInTheDocument();
  });

  it('keeps a short label verbatim as the callsign', () => {
    renderCard({ item: { label: 'XY' } });
    expect(screen.getByText('XY')).toBeInTheDocument();
  });

  it('renders the route with both airport codes', () => {
    renderCard();
    expect(screen.getByText('FRA')).toBeInTheDocument();
    expect(screen.getByText('JFK')).toBeInTheDocument();
  });

  it('marks the flight offline when there is no live data', () => {
    renderCard();
    expect(screen.getByText('offline_badge')).toBeInTheDocument();
  });

  it('drops the offline badge for an airborne live flight', () => {
    renderCard({ live: makeAc({ onGround: false }) });
    expect(screen.queryByText('offline_badge')).toBeNull();
  });

  it('drops the offline badge for a grounded live flight', () => {
    renderCard({ live: makeAc({ onGround: true }) });
    expect(screen.queryByText('offline_badge')).toBeNull();
  });

  it('wires the pin and remove icon buttons', () => {
    const { onPin, onRemove } = renderCard();
    fireEvent.click(screen.getByLabelText('pin'));
    fireEvent.click(screen.getByLabelText('remove'));
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('labels the pin button as unpin when already pinned', () => {
    renderCard({ item: { pinned: true } });
    expect(screen.getByLabelText('unpin')).toBeInTheDocument();
  });

  it('exposes two keyboard-focusable track regions', () => {
    const { container } = renderCard();
    const regions = trackRegions(container);
    expect(regions).toHaveLength(2);
    regions.forEach((r) => expect(r.getAttribute('tabindex')).toBe('0'));
  });

  it('tracks the flight on click of the header region', () => {
    const { container, onTrack } = renderCard();
    fireEvent.click(trackRegions(container)[0]);
    expect(onTrack).toHaveBeenCalledTimes(1);
  });

  it('activates tracking with Enter and Space, but ignores other keys', () => {
    const { container, onTrack } = renderCard();
    const header = trackRegions(container)[0];
    fireEvent.keyDown(header, { key: 'Enter' });
    fireEvent.keyDown(header, { key: ' ' });
    expect(onTrack).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(header, { key: 'a' });
    expect(onTrack).toHaveBeenCalledTimes(2);
  });

  it('tracks the flight from the route region too', () => {
    const { container, onTrack } = renderCard();
    fireEvent.keyDown(trackRegions(container)[1], { key: 'Enter' });
    expect(onTrack).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations in the full live + route state', async () => {
    const { container } = renderCard({ live: makeAc() });
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
