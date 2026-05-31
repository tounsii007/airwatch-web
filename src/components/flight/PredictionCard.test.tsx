// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AircraftState } from '@/lib/types';
import { PredictionCard } from './PredictionCard';

const flying: AircraftState = {
  icao24: '3c6444',
  callsign: 'DLH123',
  depIata: 'FRA',
  arrIata: 'JFK',
  baroAltitude: 11000,
  velocity: 250,
} as AircraftState;

const prediction = {
  delayProbability: 72,
  estimatedDelayMinutes: 25,
  confidence: 'high' as const,
  explanation: 'Heavy congestion expected at JFK',
  factors: ['weather', 'traffic'],
};

function mockFetchOnce(value: unknown, ok = true) {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok, json: () => Promise.resolve(value) }) as unknown as typeof fetch;
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
});

describe('<PredictionCard />', () => {
  it('renders nothing without a callsign', () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const { container } = render(
      <PredictionCard aircraft={{ depIata: 'FRA', arrIata: 'JFK' } as AircraftState} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders nothing without a departure airport', () => {
    const { container } = render(
      <PredictionCard aircraft={{ callsign: 'DLH123', arrIata: 'JFK' } as AircraftState} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the analyzing state while the request is in flight', () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    render(<PredictionCard aircraft={flying} />);
    expect(screen.getByText('AI ANALYZING...')).toBeInTheDocument();
  });

  it('renders the prediction once the request resolves', async () => {
    mockFetchOnce(prediction);
    render(<PredictionCard aircraft={flying} />);
    expect(
      await screen.findByText('Heavy congestion expected at JFK'),
    ).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('~25 min delay')).toBeInTheDocument();
    expect(screen.getByText('weather')).toBeInTheDocument();
    expect(screen.getByText('traffic')).toBeInTheDocument();
    expect(screen.getByText('Powered by Claude AI')).toBeInTheDocument();
  });

  it('tints the probability ring red for a high delay risk', async () => {
    mockFetchOnce(prediction);
    render(<PredictionCard aircraft={flying} />);
    const pct = await screen.findByText('72%');
    expect(pct.style.color).toBe('var(--error)');
  });

  it('tints the probability ring green for a low delay risk', async () => {
    mockFetchOnce({ ...prediction, delayProbability: 15 });
    render(<PredictionCard aircraft={flying} />);
    const pct = await screen.findByText('15%');
    expect(pct.style.color).toBe('var(--success)');
  });

  it('omits the estimated-delay line when no delay is expected', async () => {
    mockFetchOnce({ ...prediction, estimatedDelayMinutes: 0 });
    render(<PredictionCard aircraft={flying} />);
    await screen.findByText('Heavy congestion expected at JFK');
    expect(screen.queryByText(/min delay/)).toBeNull();
  });

  it('renders nothing when the request rejects', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
    const { container } = render(<PredictionCard aircraft={flying} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing on a non-ok response', async () => {
    mockFetchOnce(null, false);
    const { container } = render(<PredictionCard aircraft={flying} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('has no axe violations once resolved', async () => {
    mockFetchOnce(prediction);
    const { container } = render(<PredictionCard aircraft={flying} />);
    await screen.findByText('Heavy congestion expected at JFK');
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
