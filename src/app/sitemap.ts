import type { MetadataRoute } from 'next';

/**
 * Top-level routes only. Per-flight / per-airport detail pages are
 * NOT enumerated — there are millions of possible IATA / ICAO codes,
 * and the data is dynamic. Search-engine crawlers find those pages
 * organically via internal links from /search and /airports.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:13000';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    { path: '/',           priority: 1.0,  freq: 'always'  as const },
    { path: '/search',     priority: 0.9,  freq: 'daily'   as const },
    { path: '/airports',   priority: 0.9,  freq: 'weekly'  as const },
    { path: '/airlines',   priority: 0.8,  freq: 'weekly'  as const },
    { path: '/dashboard',  priority: 0.7,  freq: 'daily'   as const },
    { path: '/globe',      priority: 0.7,  freq: 'monthly' as const },
    { path: '/replay',     priority: 0.6,  freq: 'daily'   as const },
    { path: '/cargo',      priority: 0.6,  freq: 'daily'   as const },
    { path: '/spotting',   priority: 0.6,  freq: 'daily'   as const },
    { path: '/saved',      priority: 0.5,  freq: 'never'   as const },
    { path: '/settings',   priority: 0.4,  freq: 'never'   as const },
    { path: '/stats',      priority: 0.6,  freq: 'daily'   as const },
    { path: '/geofences',  priority: 0.5,  freq: 'monthly' as const },
    { path: '/compare',    priority: 0.5,  freq: 'weekly'  as const },
  ];

  return routes.map(({ path, priority, freq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: freq,
    priority,
  }));
}
