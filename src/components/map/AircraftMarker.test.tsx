// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AircraftMarker } from './AircraftMarker';
import type { AircraftState } from '@/lib/types';

// react-leaflet's <Marker>/<Tooltip> need a live Leaflet map context, which
// jsdom/happy-dom can't provide. Replace them with thin stubs that surface the
// props we care about (position, the divIcon payload, click wiring) onto the
// DOM so assertions can read them back.
type IconLike = { html?: string; iconSize?: [number, number]; iconAnchor?: [number, number] };
type MarkerStubProps = {
  position: [number, number];
  icon: IconLike;
  eventHandlers: { click: () => void };
  children?: React.ReactNode;
};
vi.mock('react-leaflet', () => ({
  Marker: ({ position, icon, eventHandlers, children }: MarkerStubProps) => (
    <div
      data-testid="marker"
      data-position={JSON.stringify(position)}
      data-icon-size={JSON.stringify(icon?.iconSize)}
      data-icon-anchor={JSON.stringify(icon?.iconAnchor)}
      data-icon-html={icon?.html}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children, permanent, direction }: { children?: React.ReactNode; permanent?: boolean; direction?: string }) => (
    <div data-testid="tooltip" data-permanent={String(permanent)} data-direction={direction}>
      {children}
    </div>
  ),
}));

// L.divIcon just packages an options bag; echo it back so the Marker stub can
// read iconSize/html off the "icon".
vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn((opts: IconLike) => opts) },
}));

const makeAc = (over: Partial<AircraftState> = {}): AircraftState => ({
  icao24: 'abc123',
  callsign: 'BAW123',
  onGround: false,
  category: 0,
  lastUpdate: 0,
  latitude: 51.5,
  longitude: -0.12,
  baroAltitude: 3000,
  trueTrack: 90,
  ...over,
});

const marker = () => screen.getByTestId('marker');
const iconHtml = () => marker().getAttribute('data-icon-html') ?? '';

afterEach(() => cleanup());

describe('<AircraftMarker />', () => {
  it('renders nothing when latitude is missing', () => {
    const { container } = render(
      <AircraftMarker aircraft={makeAc({ latitude: undefined })} isSelected={false} onClick={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when longitude is missing', () => {
    const { container } = render(
      <AircraftMarker aircraft={makeAc({ longitude: undefined })} isSelected={false} onClick={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('places the marker at the aircraft coordinates', () => {
    render(<AircraftMarker aircraft={makeAc({ latitude: 40.7, longitude: -74 })} isSelected={false} onClick={vi.fn()} />);
    expect(JSON.parse(marker().getAttribute('data-position')!)).toEqual([40.7, -74]);
  });

  it('invokes onClick with the aircraft when the marker is clicked', () => {
    const onClick = vi.fn();
    const ac = makeAc();
    render(<AircraftMarker aircraft={ac} isSelected={false} onClick={onClick} />);
    fireEvent.click(marker());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(ac);
  });

  it('shows a permanent callsign tooltip when selected', () => {
    render(<AircraftMarker aircraft={makeAc({ callsign: 'DLH456' })} isSelected onClick={vi.fn()} />);
    const tip = screen.getByTestId('tooltip');
    expect(tip).toHaveTextContent('DLH456');
    expect(tip.getAttribute('data-permanent')).toBe('true');
    expect(tip.getAttribute('data-direction')).toBe('top');
  });

  it('hides the tooltip when not selected', () => {
    render(<AircraftMarker aircraft={makeAc({ callsign: 'DLH456' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.queryByTestId('tooltip')).toBeNull();
  });

  it('hides the tooltip when selected without a callsign', () => {
    render(<AircraftMarker aircraft={makeAc({ callsign: undefined })} isSelected onClick={vi.fn()} />);
    expect(screen.queryByTestId('tooltip')).toBeNull();
  });

  it('enlarges the icon to 28px when selected', () => {
    render(<AircraftMarker aircraft={makeAc()} isSelected onClick={vi.fn()} />);
    expect(JSON.parse(marker().getAttribute('data-icon-size')!)).toEqual([28, 28]);
    expect(JSON.parse(marker().getAttribute('data-icon-anchor')!)).toEqual([14, 14]);
  });

  it('uses a compact 20px icon when not selected', () => {
    render(<AircraftMarker aircraft={makeAc()} isSelected={false} onClick={vi.fn()} />);
    expect(JSON.parse(marker().getAttribute('data-icon-size')!)).toEqual([20, 20]);
    expect(JSON.parse(marker().getAttribute('data-icon-anchor')!)).toEqual([10, 10]);
  });

  it('adds a pulse ring only to the selected icon', () => {
    const { rerender } = render(<AircraftMarker aircraft={makeAc()} isSelected onClick={vi.fn()} />);
    expect(iconHtml()).toContain('pulse-glow');
    rerender(<AircraftMarker aircraft={makeAc()} isSelected={false} onClick={vi.fn()} />);
    expect(iconHtml()).not.toContain('pulse-glow');
  });

  it('colors the icon with the ground palette for a grounded aircraft', () => {
    render(<AircraftMarker aircraft={makeAc({ onGround: true })} isSelected={false} onClick={vi.fn()} />);
    expect(iconHtml().toLowerCase()).toContain('#6b7f99');
  });

  it('colors the icon with the primary palette when altitude data is missing', () => {
    render(<AircraftMarker aircraft={makeAc({ onGround: false, baroAltitude: undefined })} isSelected={false} onClick={vi.fn()} />);
    expect(iconHtml().toLowerCase()).toContain('#00d4ff');
  });

  it('rotates the icon to the aircraft heading, defaulting to 0', () => {
    const { rerender } = render(<AircraftMarker aircraft={makeAc({ trueTrack: 135 })} isSelected={false} onClick={vi.fn()} />);
    expect(iconHtml()).toContain('rotate(135deg)');
    rerender(<AircraftMarker aircraft={makeAc({ trueTrack: undefined })} isSelected={false} onClick={vi.fn()} />);
    expect(iconHtml()).toContain('rotate(0deg)');
  });
});
