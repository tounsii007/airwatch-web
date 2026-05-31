// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AircraftState } from '@/lib/types';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';
import { MobileDetailsPanel } from './MobileDetailsPanel';

// ── Settings double (only showAircraftPhotos matters here) ───────────
const settings = vi.hoisted(() => ({ showAircraftPhotos: true }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof settings) => unknown) => selector(settings),
}));

// ── Child stubs — surface just the props this panel routes ───────────
vi.mock('@/components/flight/details/MobileHeader', () => ({
  MobileHeader: ({ displayCallsign, photoUrl, actions }: {
    displayCallsign: string; photoUrl: string | null; actions: React.ReactNode;
  }) => (
    <div data-testid="m-header" data-callsign={displayCallsign} data-photo={String(photoUrl)}>
      {actions}
    </div>
  ),
}));
vi.mock('@/components/flight/details/CompactTimesRow', () => ({
  CompactTimesRow: ({ photoUrl }: { photoUrl: string | null }) => (
    <div data-testid="m-times" data-photo={String(photoUrl)} />
  ),
}));
vi.mock('@/components/flight/details/MobileMoreSection', () => ({
  MobileMoreSection: ({ photoUrl }: { photoUrl: string | null }) => (
    <div data-testid="m-more" data-photo={String(photoUrl)} />
  ),
}));
vi.mock('@/components/flight/details/MobileStatsGrid', () => ({
  MobileStatsGrid: ({ showMore, onToggleMore }: { showMore: boolean; onToggleMore: () => void }) => (
    <button type="button" data-testid="m-stats" data-more={String(showMore)} onClick={onToggleMore}>
      stats
    </button>
  ),
}));
vi.mock('@/components/flight/details/RouteSection', () => ({
  RouteSection: ({ compact, isLoading }: { compact?: boolean; isLoading: boolean }) => (
    <div data-testid="m-route" data-compact={String(compact)} data-loading={String(isLoading)} />
  ),
}));

function makeAc(overrides: Partial<AircraftState> = {}): AircraftState {
  return { icao24: 'abc123', onGround: false, category: 0, lastUpdate: 0, ...overrides };
}
function makeVM(overrides: Partial<FlightDetailsVM> = {}): FlightDetailsVM {
  return {
    airlineIata: 'LH', airlineInfo: { name: 'Lufthansa' }, displayCallsign: 'LH123',
    depIata: 'FRA', depCity: 'Frankfurt', depCountry: 'Germany', depCode: 'DE',
    arrIata: 'JFK', arrCity: 'New York', arrCountry: 'United States', arrCode: 'US',
    co2Estimate: null, metadata: null, photoUrl: 'https://img/p.jpg', routeInfo: null,
    ...overrides,
  } as unknown as FlightDetailsVM;
}

function renderPanel(opts: { ac?: AircraftState; vm?: FlightDetailsVM; isLoading?: boolean; actions?: React.ReactNode } = {}) {
  return render(
    <MobileDetailsPanel
      aircraft={opts.ac ?? makeAc()}
      viewModel={opts.vm ?? makeVM()}
      language="en"
      altitudeUnit="ft"
      speedUnit="kts"
      isLoading={opts.isLoading ?? false}
      actions={opts.actions ?? <button type="button">act</button>}
    />,
  );
}

beforeEach(() => { settings.showAircraftPhotos = true; });
afterEach(() => cleanup());

describe('<MobileDetailsPanel />', () => {
  it('lays out the sheet with header, route, times and stats — more hidden', () => {
    renderPanel();
    expect(screen.getByTestId('m-header')).toBeInTheDocument();
    expect(screen.getByTestId('m-route')).toBeInTheDocument();
    expect(screen.getByTestId('m-times')).toBeInTheDocument();
    expect(screen.getByTestId('m-stats')).toBeInTheDocument();
    expect(screen.queryByTestId('m-more')).toBeNull();
  });

  it('passes the resolved display callsign to the header', () => {
    renderPanel({ vm: makeVM({ displayCallsign: 'DLH456' }) });
    expect(screen.getByTestId('m-header')).toHaveAttribute('data-callsign', 'DLH456');
  });

  it('falls back to the icao24 when no display callsign resolved', () => {
    renderPanel({ ac: makeAc({ icao24: 'cafe01' }), vm: makeVM({ displayCallsign: undefined }) });
    expect(screen.getByTestId('m-header')).toHaveAttribute('data-callsign', 'cafe01');
  });

  it('forwards the photo URL when photos are enabled', () => {
    settings.showAircraftPhotos = true;
    renderPanel({ vm: makeVM({ photoUrl: 'https://img/x.jpg' }) });
    expect(screen.getByTestId('m-header')).toHaveAttribute('data-photo', 'https://img/x.jpg');
    expect(screen.getByTestId('m-times')).toHaveAttribute('data-photo', 'https://img/x.jpg');
  });

  it('masks the photo URL everywhere when photos are disabled', () => {
    settings.showAircraftPhotos = false;
    renderPanel({ vm: makeVM({ photoUrl: 'https://img/x.jpg' }) });
    expect(screen.getByTestId('m-header')).toHaveAttribute('data-photo', 'null');
    expect(screen.getByTestId('m-times')).toHaveAttribute('data-photo', 'null');
  });

  it('reveals the more-section only after the stats grid requests it', () => {
    renderPanel();
    expect(screen.queryByTestId('m-more')).toBeNull();
    fireEvent.click(screen.getByTestId('m-stats'));
    expect(screen.getByTestId('m-more')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m-stats'));
    expect(screen.queryByTestId('m-more')).toBeNull();
  });

  it('also masks the photo in the more-section when photos are off', () => {
    settings.showAircraftPhotos = false;
    renderPanel({ vm: makeVM({ photoUrl: 'https://img/x.jpg' }) });
    fireEvent.click(screen.getByTestId('m-stats'));
    expect(screen.getByTestId('m-more')).toHaveAttribute('data-photo', 'null');
  });

  it('drives the route section in compact, loading-aware mode', () => {
    renderPanel({ isLoading: true });
    const route = screen.getByTestId('m-route');
    expect(route).toHaveAttribute('data-compact', 'true');
    expect(route).toHaveAttribute('data-loading', 'true');
  });

  it('renders the supplied action node', () => {
    renderPanel({ actions: <button type="button">share-it</button> });
    expect(screen.getByRole('button', { name: 'share-it' })).toBeInTheDocument();
  });
});
