import type { MapStyle } from '@/lib/types';

interface StyleDef {
  attr: string;
  colors: { ground: string; high: string; low: string; med: string; selected: string };
  dark: boolean;
  label: string;
  maxNative?: number;
  subdomains?: string;
  url: string;
}

/**
 * All tile URLs are SAME-ORIGIN. nginx proxies /tiles/<provider>/... to the
 * actual CDN (CARTO / Google / OSM / etc.) with disk-cache, so the browser's
 * Network tab only sees http://localhost:13000/tiles/... — the upstream
 * provider is invisible to the user. See airwatch/nginx/nginx.conf for the
 * proxy + cache config and airwatch-web/next.config.ts for the Next.js
 * rewrite that forwards /tiles/ → nginx.
 *
 * Subdomain placeholders ({s}) are gone: with HTTP/2 (which all browsers
 * use against localhost via Next-standalone) the per-host concurrency
 * cap is irrelevant, so a single endpoint per provider is simpler.
 *
 * "no labels" variants stay — airport labels are rendered by our own
 * useAirportLabels hook against the AIRPORTS dataset.
 */
export const MAP_STYLES: Record<MapStyle, StyleDef> = {
  dark: {
    url: '/tiles/carto/dark_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO &copy; OSM',
    dark: false,
    label: 'DRK',
    colors: { low: '#4ADE80', med: '#FBBF24', high: '#E879A8', ground: '#6B7280', selected: '#E0F0FF' },
  },
  night: {
    url: '/tiles/carto/dark_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO',
    dark: false,
    label: 'NGT',
    colors: { low: '#00FF88', med: '#FF9500', high: '#FF3B7A', ground: '#555555', selected: '#FFFFFF' },
  },
  satellite: {
    url: '/tiles/google/sat/{z}/{x}/{y}',
    attr: '&copy; Google',
    dark: false,
    label: 'SAT',
    colors: { low: '#00FF66', med: '#FFD700', high: '#FF4488', ground: '#AAAAAA', selected: '#FFFFFF' },
  },
  streets: {
    url: '/tiles/carto/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO &copy; OSM',
    dark: false,
    label: 'STR',
    colors: { low: '#0066FF', med: '#CC0000', high: '#9900CC', ground: '#333333', selected: '#FF6600' },
  },
  terrain: {
    url: '/tiles/carto/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO &copy; OSM',
    dark: false,
    label: 'TER',
    colors: { low: '#0000FF', med: '#FF0000', high: '#8B00FF', ground: '#000000', selected: '#FF6600' },
  },
  toner: {
    url: '/tiles/carto/light_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO',
    dark: false,
    label: 'LGT',
    colors: { low: '#22C55E', med: '#EAB308', high: '#EC4899', ground: '#9CA3AF', selected: '#2563EB' },
  },
};

export const STYLE_ORDER: MapStyle[] = ['dark', 'night', 'satellite', 'streets', 'terrain', 'toner'];
export const TRANSPARENT_TILE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
export const MAX_VISIBLE_MARKERS = 800;
