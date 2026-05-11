// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetWeatherCache,
  getCachedWeather,
  prefetchAirportWeather,
  WEATHER_TTL_MS,
} from './useAirportWeather';

/** Simulate the Open-Meteo proxy response shape. */
function fakeWeatherResponse(weatherCode: number, isDay: boolean): Response {
  return new Response(
    JSON.stringify({ current: { weather_code: weatherCode, is_day: isDay ? 1 : 0 } }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('useAirportWeather (cache + prefetch)', () => {
  beforeEach(() => {
    _resetWeatherCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('getCachedWeather returns null until a fetch lands', () => {
    expect(getCachedWeather('FRA')).toBeNull();
  });

  it('prefetch lands an entry that subsequent getCachedWeather reads', async () => {
    globalThis.fetch = vi.fn(async () => fakeWeatherResponse(61, true)) as unknown as typeof fetch;
    prefetchAirportWeather('FRA', 50.0, 8.5, true);

    // Allow the rate-limit gap (250 ms) + microtask flush.
    await vi.advanceTimersByTimeAsync(300);

    const entry = getCachedWeather('FRA');
    expect(entry).not.toBeNull();
    expect(entry!.code).toBe(61);
    expect(entry!.isDay).toBe(true);
  });

  it('prefetch is a no-op when enabled=false', () => {
    const fetchSpy = vi.fn(async () => fakeWeatherResponse(0, true)) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;
    prefetchAirportWeather('LHR', 51.5, -0.5, false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getCachedWeather('LHR')).toBeNull();
  });

  it('prefetch dedupes simultaneous calls for the same iata', async () => {
    const fetchSpy = vi.fn(async () => fakeWeatherResponse(2, true)) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;

    prefetchAirportWeather('CDG', 49.0, 2.5, true);
    prefetchAirportWeather('CDG', 49.0, 2.5, true); // second call — should not fire fetch
    prefetchAirportWeather('CDG', 49.0, 2.5, true); // third call — same

    await vi.advanceTimersByTimeAsync(300);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('prefetch refuses to refetch a fresh cache entry', async () => {
    const fetchSpy = vi.fn(async () => fakeWeatherResponse(95, true)) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;

    prefetchAirportWeather('JFK', 40.6, -73.8, true);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Same airport + still fresh → no second call.
    prefetchAirportWeather('JFK', 40.6, -73.8, true);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('prefetch refetches once the cache TTL expires', async () => {
    const fetchSpy = vi.fn(async () => fakeWeatherResponse(3, true)) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;

    prefetchAirportWeather('AMS', 52.3, 4.7, true);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Skip past the TTL — the next prefetch should call again.
    vi.advanceTimersByTime(WEATHER_TTL_MS + 1);
    prefetchAirportWeather('AMS', 52.3, 4.7, true);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('prefetch fail-soft: a 5xx response leaves the cache empty without throwing', async () => {
    globalThis.fetch = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    prefetchAirportWeather('IST', 41.0, 28.7, true);
    await vi.advanceTimersByTimeAsync(300);
    expect(getCachedWeather('IST')).toBeNull();
  });

  it('prefetch fail-soft: a thrown fetch rejection leaves the cache empty', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    prefetchAirportWeather('VIE', 48.1, 16.3, true);
    await vi.advanceTimersByTimeAsync(300);
    expect(getCachedWeather('VIE')).toBeNull();
  });
});
