// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AircraftState } from '@/lib/types';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';
import { FlightDetailsPanel } from './FlightDetailsPanel';

// ── Mutable mock state ───────────────────────────────────────────────
const flight = vi.hoisted(() => ({
  selectedAircraft: null as AircraftState | null,
  clearSelection: vi.fn(),
}));
const settings = vi.hoisted(() => ({ altitudeUnit: 'ft', speedUnit: 'kts', language: 'en' }));
const favorites = vi.hoisted(() => ({ toggleFavorite: vi.fn(), items: [] as { id: string }[] }));
const loader = vi.hoisted(() => ({
  details: { metadata: null, photoUrl: null, routeInfo: null },
  isLoading: false, isRefreshing: false, refreshStatus: 'idle', handleRefresh: vi.fn(),
}));
const vmHolder = vi.hoisted(() => ({ vm: null as FlightDetailsVM | null }));
const shareHolder = vi.hoisted(() => ({ copied: false, share: vi.fn() }));

vi.mock('@/lib/stores/flightStore', () => ({
  useFlightStore: (s: (st: typeof flight) => unknown) => s(flight),
}));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (s: (st: typeof settings) => unknown) => s(settings),
}));
vi.mock('@/lib/stores/favoritesStore', () => ({
  useFavoritesStore: (s: (st: typeof favorites) => unknown) => s(favorites),
}));
vi.mock('@/components/flight/details/useFlightDetailsLoader', () => ({
  useFlightDetailsLoader: () => loader,
}));
vi.mock('@/components/flight/details/useFlightDetailsViewModel', () => ({
  useFlightDetailsViewModel: () => vmHolder.vm,
}));
vi.mock('@/components/flight/details/useShareFlight', () => ({
  useShareFlight: () => shareHolder,
}));

// Stub the two layouts + the header-actions cluster down to the props
// the orchestrator actually wires up.
vi.mock('@/components/flight/details/MobileDetailsPanel', () => ({
  MobileDetailsPanel: ({ aircraft, actions }: { aircraft: AircraftState; actions: React.ReactNode }) => (
    <div data-testid="mobile" data-icao={aircraft.icao24}>{actions}</div>
  ),
}));
vi.mock('@/components/flight/details/DesktopDetailsPanel', () => ({
  DesktopDetailsPanel: ({ copied, onShare }: { copied: boolean; onShare: () => void }) => (
    <button type="button" data-testid="desktop-share" data-copied={String(copied)} onClick={onShare}>
      share
    </button>
  ),
}));
vi.mock('@/components/flight/details/DetailsHeaderActions', () => ({
  DetailsHeaderActions: ({ isFav, onToggleFavorite, onClose, onRefresh }: {
    isFav: boolean; onToggleFavorite: () => void; onClose: () => void; onRefresh: () => void;
  }) => (
    <div data-testid="actions" data-fav={String(isFav)}>
      <button type="button" onClick={onToggleFavorite}>fav</button>
      <button type="button" onClick={onClose}>close</button>
      <button type="button" onClick={onRefresh}>refresh</button>
    </div>
  ),
}));

function makeAc(overrides: Partial<AircraftState> = {}): AircraftState {
  return { icao24: 'abc123', callsign: 'DLH123', originCountry: 'Germany', onGround: false, category: 0, lastUpdate: 0, ...overrides };
}
function makeVM(): FlightDetailsVM {
  return {
    airlineIata: 'LH', airlineInfo: { name: 'Lufthansa' }, displayCallsign: 'LH123',
    depIata: 'FRA', arrIata: 'JFK', co2Estimate: null, metadata: null, photoUrl: null, routeInfo: null,
  } as unknown as FlightDetailsVM;
}

beforeEach(() => {
  flight.selectedAircraft = makeAc();
  flight.clearSelection.mockClear();
  favorites.toggleFavorite.mockClear();
  favorites.items = [];
  loader.handleRefresh.mockClear();
  vmHolder.vm = makeVM();
  shareHolder.copied = false;
  shareHolder.share.mockClear();
});
afterEach(() => cleanup());

describe('<FlightDetailsPanel />', () => {
  it('renders nothing when no aircraft is selected', () => {
    flight.selectedAircraft = null;
    const { container } = render(<FlightDetailsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the view model is unavailable', () => {
    vmHolder.vm = null;
    const { container } = render(<FlightDetailsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders both layouts once an aircraft and view model exist', () => {
    render(<FlightDetailsPanel />);
    expect(screen.getByTestId('mobile')).toHaveAttribute('data-icao', 'abc123');
    expect(screen.getByTestId('desktop-share')).toBeInTheDocument();
  });

  it('clears the selection when the mobile backdrop is tapped', () => {
    const { container } = render(<FlightDetailsPanel />);
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(flight.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('closes from the header action cluster', () => {
    render(<FlightDetailsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(flight.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('refreshes from the header action cluster', () => {
    render(<FlightDetailsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));
    expect(loader.handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('shares the display callsign and route via the share hook', () => {
    render(<FlightDetailsPanel />);
    fireEvent.click(screen.getByTestId('desktop-share'));
    expect(shareHolder.share).toHaveBeenCalledWith({
      icao24: 'abc123', callsign: 'LH123', depIata: 'FRA', arrIata: 'JFK',
    });
  });

  it('toggles the favourite with a fully-formed payload', () => {
    render(<FlightDetailsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'fav' }));
    expect(favorites.toggleFavorite).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'abc123', type: 'flight', label: 'DLH123',
        airlineName: 'Lufthansa', airlineIata: 'LH',
        depIata: 'FRA', arrIata: 'JFK', originCountry: 'Germany',
      }),
    );
  });

  it('falls back to the icao24 label when the aircraft has no callsign', () => {
    flight.selectedAircraft = makeAc({ callsign: undefined });
    render(<FlightDetailsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'fav' }));
    expect(favorites.toggleFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'abc123' }),
    );
  });

  it('reflects the favourite state from the store', () => {
    favorites.items = [{ id: 'abc123' }];
    render(<FlightDetailsPanel />);
    expect(screen.getByTestId('actions')).toHaveAttribute('data-fav', 'true');
  });

  it('marks a non-favourite aircraft accordingly', () => {
    favorites.items = [{ id: 'other' }];
    render(<FlightDetailsPanel />);
    expect(screen.getByTestId('actions')).toHaveAttribute('data-fav', 'false');
  });

  it('passes the copied state through to the desktop panel', () => {
    shareHolder.copied = true;
    render(<FlightDetailsPanel />);
    expect(screen.getByTestId('desktop-share')).toHaveAttribute('data-copied', 'true');
  });
});
