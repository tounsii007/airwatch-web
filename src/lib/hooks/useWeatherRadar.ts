import { useState, useEffect } from 'react';

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';

/**
 * Fetches the latest RainViewer radar tile timestamp.
 * Returns the tile URL template: replace {z}/{x}/{y} with Leaflet coords.
 */
export function useWeatherRadar(): string | null {
  const [tileUrl, setTileUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTimestamp() {
      try {
        const res = await fetch(RAINVIEWER_API);
        const data = await res.json();
        const radar = data?.radar?.past;
        if (Array.isArray(radar) && radar.length > 0) {
          const latest = radar[radar.length - 1];
          if (latest?.path && !cancelled) {
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
