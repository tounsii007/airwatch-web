import { useState, useEffect } from 'react';

/**
 * Fetches the latest RainViewer radar tile timestamp.
 *
 * Both endpoints are same-origin via the nginx asset proxy:
 *   /weather-radar/maps.json   → api.rainviewer.com/public/weather-maps.json
 *   /weather-radar/tiles/...   → tilecache.rainviewer.com/...
 * The browser's Network tab never sees the actual RainViewer hostnames.
 *
 * Returns a tile URL template; replace {z}/{x}/{y} via Leaflet's
 * TileLayer URL substitution.
 */
const RADAR_INDEX = '/weather-radar/maps.json';

export function useWeatherRadar(): string | null {
  const [tileUrl, setTileUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTimestamp() {
      try {
        const res = await fetch(RADAR_INDEX);
        const data = await res.json();
        const radar = data?.radar?.past;
        if (Array.isArray(radar) && radar.length > 0) {
          const latest = radar[radar.length - 1];
          if (latest?.path && !cancelled) {
            // RainViewer returns paths like "/v2/radar/1234567890" — they
            // already start with "/", so concatenation with the proxy
            // prefix produces /weather-radar/tiles/v2/radar/1234567890/...
            setTileUrl(`/weather-radar/tiles${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
          }
        }
      } catch { /* silently fail */ }
    }
    fetchTimestamp();
    // Refresh every 10 minutes (radar data updates every ~6-10 min)
    const timer = setInterval(fetchTimestamp, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return tileUrl;
}
