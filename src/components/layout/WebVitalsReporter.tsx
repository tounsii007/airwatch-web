'use client';

/**
 * Forwards Core Web Vitals (CLS, INP, LCP, FCP, TTFB) to the server-side
 * log sink so they show up in Grafana under `service=web` alongside
 * the regular log stream.
 *
 * Why: every web app's perceived speed is the median Core Web Vitals
 * across real users. Synthetic tests in CI only catch regressions on
 * the test machine; only RUM (real user monitoring) catches the user
 * on a slow phone in a tunnel. With this hook + the Loki dashboard,
 * the team sees P75 LCP / CLS / INP per route per deploy.
 *
 * Performance: navigator.sendBeacon is non-blocking. Each metric is
 * ~200 bytes — measurement overhead is negligible.
 */
import { useReportWebVitals } from 'next/web-vitals';

interface VitalsPayload {
  metric: string;       // 'CLS' | 'INP' | 'LCP' | 'FCP' | 'TTFB'
  value: number;
  rating: string;       // 'good' | 'needs-improvement' | 'poor'
  delta: number;
  id: string;
  navigationType: string;
  url: string;
  ts: number;
}

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const payload: VitalsPayload = {
      metric: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      delta: Math.round(metric.delta),
      id: metric.id,
      navigationType: metric.navigationType,
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      ts: Date.now(),
    };

    // Use sendBeacon when available — non-blocking, survives navigation
    // away from the page (important for unload-time metrics like CLS).
    // Fallback to fetch keepalive for older browsers.
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon(
        '/api/web-vitals',
        new Blob([body], { type: 'application/json' }),
      );
    } else {
      void fetch('/api/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  });

  return null;
}
