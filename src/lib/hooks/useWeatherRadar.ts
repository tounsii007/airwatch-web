import { useState, useEffect } from 'react';

/**
 * Fetches the latest RainViewer radar tile timestamp.
 *
 * <h3>Direct CDN (no nginx proxy)</h3>
 * Both endpoints hit RainViewer directly. The previous design routed
 * them through nginx /weather-radar/* with disk caching, but that was
 * removed alongside the basemap proxy: same Chrome-per-host-cap issue,
 * same DevTools-noise issue, plus RainViewer's own CDN already serves
 * tiles from edge POPs and applies its own cache headers.
 *
 * <h3>CSP requirement</h3>
 * `connect-src` must allow `api.rainviewer.com` (for the JSON index)
 * and `img-src` must allow `tilecache.rainviewer.com` (for the PNG
 * tiles). Both are added in src/proxy.ts.
 */
const RADAR_INDEX = 'https://api.rainviewer.com/public/weather-maps.json';

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
            // already start with "/", so concatenation with the upstream
            // host produces https://tilecache.rainviewer.com/v2/radar/...
            setTileUrl(`https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
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
