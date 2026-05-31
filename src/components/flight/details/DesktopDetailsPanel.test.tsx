// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AircraftState } from '@/lib/types';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';
import { DesktopDetailsPanel } from './DesktopDetailsPanel';

const settings = vi.hoisted(() => ({ showAircraftPhotos: true }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof settings) => unknown) => selector(settings),
}));

// ── Child stubs ──────────────────────────────────────────────────────
vi.mock('@/components/flight/details/DesktopHeader', () => ({
  DesktopHeader: ({ displayCallsign, icao24, actions }: {
    displayCallsign: string; icao24: string; actions: React.ReactNode;
  }) => (
    <div data-testid="d-header" data-callsign={displayCallsign} data-icao={icao24}>{actions}</div>
  ),
}));
vi.mock('@/components/flight/details/RouteSection', () => ({
  RouteSection: ({ compact }: { compact?: boolean }) => (
    <div data-testid="d-route" data-compact={String(compact)} />
  ),
}));
vi.mock('@/components/flight/details/RouteStatsBadge', () => ({
  RouteStatsBadge: () => <div data-testid="d-routestats" />,
}));
vi.mock('@/components/flight/details/MetadataSection', () => ({
  MetadataSection: () => <div data-testid="d-meta" />,
}));
vi.mock('@/components/flight/details/FleetInfoCard', () => ({
  FleetInfoCard: () => <div data-testid="d-fleet" />,
}));
vi.mock('@/components/flight/details/DesktopStats', () => ({
  DesktopStats: () => <div data-testid="d-stats" />,
}));
vi.mock('@/components/flight/details/Co2Footer', () => ({
  Co2Footer: ({ copied, onShare }: { copied: boolean; onShare: () => void }) => (
    <button type="button" data-testid="d-co2" data-copied={String(copied)} onClick={onShare}>co2</button>
  ),
}));
vi.mock('@/components/flight/details/AircraftPhoto', () => ({
  AircraftPhoto: ({ photoUrl, onExpand }: { photoUrl: string; onExpand: () => void }) => (
    <button type="button" data-testid="d-photo" data-photo={String(photoUrl)} onClick={onExpand}>photo</button>
  ),
}));
vi.mock('@/components/flight/details/primitives', () => ({
  TimesRow: () => <div data-testid="d-times" />,
}));
vi.mock('@/components/flight/PhotoGallery', () => ({
  PhotoGallery: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="d-gallery">
      <button type="button" onClick={onClose}>close-gallery</button>
    </div>
  ),
}));
vi.mock('@/components/flight/PredictionCard', () => ({
  PredictionCard: () => <div data-testid="d-prediction" />,
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

function renderPanel(opts: { ac?: AircraftState; vm?: FlightDetailsVM; copied?: boolean; onShare?: () => void } = {}) {
  return render(
    <DesktopDetailsPanel
      aircraft={opts.ac ?? makeAc()}
      viewModel={opts.vm ?? makeVM()}
      language="en"
      altitudeUnit="ft"
      speedUnit="kts"
      actions={<button type="button">act</button>}
      copied={opts.copied ?? false}
      onShare={opts.onShare ?? vi.fn()}
    />,
  );
}

beforeEach(() => { settings.showAircraftPhotos = true; });
afterEach(() => cleanup());

describe('<DesktopDetailsPanel />', () => {
  it('renders the core column — header, route, stats, prediction, footer', () => {
    renderPanel();
    for (const id of ['d-header', 'd-route', 'd-routestats', 'd-fleet', 'd-prediction', 'd-stats', 'd-co2']) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    // Route-dependent sections are absent for a bare view model.
    expect(screen.queryByTestId('d-times')).toBeNull();
    expect(screen.queryByTestId('d-meta')).toBeNull();
  });

  it('passes the resolved display callsign to the header', () => {
    renderPanel({ vm: makeVM({ displayCallsign: 'DLH456' }) });
    expect(screen.getByTestId('d-header')).toHaveAttribute('data-callsign', 'DLH456');
  });

  it('falls back to the icao24 when no display callsign resolved', () => {
    renderPanel({ ac: makeAc({ icao24: 'cafe01' }), vm: makeVM({ displayCallsign: undefined }) });
    expect(screen.getByTestId('d-header')).toHaveAttribute('data-callsign', 'cafe01');
  });

  it('renders the times row only when a scheduled departure exists', () => {
    expect(screen.queryByTestId('d-times')).toBeNull();
    renderPanel({ vm: makeVM({ routeInfo: { scheduledDep: 1700000000 } as FlightDetailsVM['routeInfo'] }) });
    expect(screen.getByTestId('d-times')).toBeInTheDocument();
  });

  it('renders the metadata section only when metadata is present', () => {
    renderPanel({ vm: makeVM({ metadata: { registration: 'D-AIMA' } as FlightDetailsVM['metadata'] }) });
    expect(screen.getByTestId('d-meta')).toBeInTheDocument();
  });

  it('shows the aircraft photo when enabled and a URL is present', () => {
    settings.showAircraftPhotos = true;
    renderPanel({ vm: makeVM({ photoUrl: 'https://img/x.jpg' }) });
    expect(screen.getByTestId('d-photo')).toHaveAttribute('data-photo', 'https://img/x.jpg');
  });

  it('hides the photo when the setting is off', () => {
    settings.showAircraftPhotos = false;
    renderPanel({ vm: makeVM({ photoUrl: 'https://img/x.jpg' }) });
    expect(screen.queryByTestId('d-photo')).toBeNull();
  });

  it('hides the photo when no URL is available', () => {
    settings.showAircraftPhotos = true;
    renderPanel({ vm: makeVM({ photoUrl: null }) });
    expect(screen.queryByTestId('d-photo')).toBeNull();
  });

  it('opens the gallery from the photo and closes it again', () => {
    settings.showAircraftPhotos = true;
    renderPanel({ vm: makeVM({ photoUrl: 'https://img/x.jpg' }) });
    expect(screen.queryByTestId('d-gallery')).toBeNull();
    fireEvent.click(screen.getByTestId('d-photo'));
    expect(screen.getByTestId('d-gallery')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close-gallery' }));
    expect(screen.queryByTestId('d-gallery')).toBeNull();
  });

  it('wires the copied flag and share handler into the footer', () => {
    const onShare = vi.fn();
    renderPanel({ copied: true, onShare });
    const footer = screen.getByTestId('d-co2');
    expect(footer).toHaveAttribute('data-copied', 'true');
    fireEvent.click(footer);
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
