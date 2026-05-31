// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AircraftState } from '@/lib/types';
import { VoiceButton } from './VoiceButton';

// ── Minimal SpeechRecognition double ────────────────────────────────
interface RecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface RecognitionEvent {
  results: { length: number; [index: number]: RecognitionResult };
}

const instances: MockRecognition[] = [];
class MockRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((e: RecognitionEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  constructor() {
    instances.push(this);
  }
}

function speechEvent(text: string, isFinal: boolean): RecognitionEvent {
  const result = Object.assign([{ transcript: text }], { isFinal }) as unknown as RecognitionResult;
  const results = Object.assign([result], { length: 1 }) as unknown as RecognitionEvent['results'];
  return { results };
}

// ── Store / router doubles ──────────────────────────────────────────
const settings = vi.hoisted(() => ({
  language: 'en',
  setMapStyle: vi.fn(),
  setShowRadar: vi.fn(),
  showRadar: false,
  setShowTurbulence: vi.fn(),
  showTurbulence: false,
}));
const flight = vi.hoisted(() => ({
  aircraftMap: new Map<string, AircraftState>(),
  selectAircraft: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: typeof settings) => unknown) => selector(settings),
}));
vi.mock('@/lib/stores/flightStore', () => ({
  useFlightStore: (selector: (s: typeof flight) => unknown) => selector(flight),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// parseVoiceCommand stays REAL so the transcript→command path is exercised.

function makeAc(callsign: string): AircraftState {
  return { icao24: callsign.toLowerCase(), callsign, onGround: false, category: 0, lastUpdate: 0 };
}

const enableSpeech = () => {
  (window as unknown as Record<string, unknown>).SpeechRecognition = MockRecognition;
};

/** Render with speech support on, then start a listening session. */
function startListening() {
  enableSpeech();
  render(<VoiceButton />);
  fireEvent.click(screen.getByRole('button', { name: 'Start voice command' }));
  return instances[0];
}

const fireResult = (recognition: MockRecognition, text: string, isFinal = true) =>
  act(() => recognition.onresult?.(speechEvent(text, isFinal)));

beforeEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  instances.length = 0;
  settings.language = 'en';
  settings.showRadar = false;
  settings.showTurbulence = false;
  settings.setMapStyle.mockClear();
  settings.setShowRadar.mockClear();
  settings.setShowTurbulence.mockClear();
  flight.aircraftMap = new Map();
  flight.selectAircraft.mockClear();
  router.push.mockClear();
});
afterEach(() => cleanup());

describe('<VoiceButton />', () => {
  it('renders nothing when speech recognition is unavailable', () => {
    render(<VoiceButton />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows an idle mic button once recognition is supported', () => {
    enableSpeech();
    render(<VoiceButton />);
    const button = screen.getByRole('button', { name: 'Start voice command' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('starts a recognition session and reflects the listening state', () => {
    const recognition = startListening();
    expect(instances).toHaveLength(1);
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(recognition.continuous).toBe(false);
    expect(recognition.interimResults).toBe(true);
    const live = screen.getByRole('button', { name: 'Stop voice command' });
    expect(live).toHaveAttribute('aria-pressed', 'true');
    expect(live.className).toContain('animate-pulse');
  });

  it('stops the session on a second press', () => {
    const recognition = startListening();
    fireEvent.click(screen.getByRole('button', { name: 'Stop voice command' }));
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Start voice command' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('derives the recognition locale from the active language', () => {
    settings.language = 'de';
    const recognition = startListening();
    expect(recognition.lang).toBe('de-DE');
  });

  it('runs a parsed style command and flashes feedback', () => {
    const recognition = startListening();
    fireResult(recognition, 'dark mode');
    expect(settings.setMapStyle).toHaveBeenCalledWith('dark');
    expect(screen.getByText('DARK')).toBeInTheDocument();
  });

  it('selects a matching live flight from a spoken callsign', () => {
    const ac = makeAc('DLH123');
    flight.aircraftMap = new Map([[ac.icao24, ac]]);
    const recognition = startListening();
    fireResult(recognition, 'show flight DLH123');
    expect(flight.selectAircraft).toHaveBeenCalledWith(ac);
    expect(screen.getByText('✈ DLH123')).toBeInTheDocument();
  });

  it('reports an unknown flight when no aircraft matches', () => {
    const recognition = startListening();
    fireResult(recognition, 'show flight ZZ999');
    expect(flight.selectAircraft).not.toHaveBeenCalled();
    expect(screen.getByText('? ZZ999')).toBeInTheDocument();
  });

  it('navigates to a spoken airport, upper-casing the code', () => {
    const recognition = startListening();
    fireResult(recognition, 'go to airport munich');
    expect(router.push).toHaveBeenCalledWith('/airports/MUNICH');
  });

  it('toggles the radar layer based on its current state', () => {
    settings.showRadar = false;
    const recognition = startListening();
    fireResult(recognition, 'radar');
    expect(settings.setShowRadar).toHaveBeenCalledWith(true);
    expect(screen.getByText('RADAR ON')).toBeInTheDocument();
  });

  it('shows an interim transcript without executing a command', () => {
    const recognition = startListening();
    fireResult(recognition, 'zoom', false);
    expect(screen.getByText('zoom')).toBeInTheDocument();
    expect(settings.setMapStyle).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('flags an unrecognised final transcript', () => {
    const recognition = startListening();
    fireResult(recognition, 'blahblah nonsense');
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('drops out of listening when recognition ends', () => {
    const recognition = startListening();
    act(() => recognition.onend?.());
    expect(screen.getByRole('button', { name: 'Start voice command' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('drops out of listening on a recognition error', () => {
    const recognition = startListening();
    act(() => recognition.onerror?.());
    expect(screen.getByRole('button', { name: 'Start voice command' })).toBeInTheDocument();
  });

  it('has no axe violations when idle', async () => {
    enableSpeech();
    const { container } = render(<VoiceButton />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
