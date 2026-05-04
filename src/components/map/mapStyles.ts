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
 * Tile URLs point DIRECTLY at the upstream CDN — no server proxy hop.
 *
 * <h3>Why direct CDN (changed from same-origin /tiles/* proxy)</h3>
 * The original design routed everything through nginx → /tiles/carto/…
 * with a 7-day disk cache. Operationally that worked, but it caused
 * three classes of browser issues that vanish with direct CDN:
 *   * Chrome's per-host concurrency cap (6 conns) hit the local nginx
 *     hard during pan/zoom — every tile request queued on the same
 *     localhost:13000 origin and stalled the rest of the page.
 *   * Some intermediate proxies (corporate, VPN) cached the proxied
 *     PNGs incorrectly and served stale or partial bodies.
 *   * The dev-tools "Network" tab was flooded with 100+ same-origin
 *     requests on every map move, drowning out actual app traffic.
 *
 * Direct-CDN trades the disk cache (CARTO's edge nodes do that anyway)
 * for: parallel connections to multiple CDN hosts, real cache headers
 * from the upstream, and a 4× smaller Network-tab signal-to-noise.
 *
 * <h3>{s} subdomains</h3>
 * Brought back for HTTP/1.1 paths where the per-host cap still bites
 * (older Safari, intermediate proxies that downgrade to H1). Leaflet
 * round-robins {s} across 'a', 'b', 'c', 'd' automatically.
 *
 * <h3>CSP requirements</h3>
 * The CSP `img-src` directive in proxy.ts must allow each host below.
 * If you add a provider here, allowlist it there too — otherwise the
 * browser silently drops every tile request.
 */
/*
 * Each entry uses a VISUALLY DISTINCT upstream tile set so the picker
 * actually swaps the basemap, not just the marker palette. Earlier
 * five of six styles shared two CARTO URLs and the user reasonably
 * concluded "the picker doesn't work" because clicking DRK / NGT or
 * STR / TER produced identical basemaps.
 *
 * CARTO offers `_nolabels`, `_all` (with labels), and the rastertiles
 * voyager family. For terrain we reach outside CARTO to OpenTopoMap
 * (the only public API-key-free terrain raster).
 */
export const MAP_STYLES: Record<MapStyle, StyleDef> = {
  dark: {
    // Pure dark, no labels. Best for "let the markers speak".
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attr: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    dark: false,
    label: 'DRK',
    colors: { low: '#4ADE80', med: '#FBBF24', high: '#E879A8', ground: '#6B7280', selected: '#E0F0FF' },
  },
  night: {
    // Dark base WITH city labels — visibly distinct from DRK. The
    // brighter cyan/magenta palette completes the "night-ops" look.
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attr: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    dark: false,
    label: 'NGT',
    colors: { low: '#00FF88', med: '#FF9500', high: '#FF3B7A', ground: '#555555', selected: '#FFFFFF' },
  },
  satellite: {
    // Google satellite tiles, public unauthenticated endpoint via
    // mt0-3.google.com. No API key required for low-volume raster
    // use. The {s} subdomain split keeps the per-host cap from
    // throttling pan/zoom on slower connections.
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attr: '&copy; <a href="https://www.google.com/maps">Google</a>',
    dark: false,
    label: 'SAT',
    // 18 (not 19) to match CONFIG.maxZoom — Leaflet's TileLayer
    // doesn't fetch tiles beyond the user-visible zoom anyway, and
    // mapInteractions.test asserts maxNative <= CONFIG.maxZoom as a
    // sanity check.
    maxNative: 18,
    colors: { low: '#00FF66', med: '#FFD700', high: '#FF4488', ground: '#AAAAAA', selected: '#FFFFFF' },
  },
  streets: {
    // Voyager WITH labels — the typical "Google Maps look".
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attr: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    dark: false,
    label: 'STR',
    colors: { low: '#0066FF', med: '#CC0000', high: '#9900CC', ground: '#333333', selected: '#FF6600' },
  },
  terrain: {
    // OpenTopoMap — actual relief shading + contour lines + topo
    // labels. Visibly different from any CARTO/Google variant; the
    // only "true terrain" raster the public OSM ecosystem ships
    // without an API key. maxNative 17 = OTM's actual upper bound;
    // beyond 17 Leaflet will scale-up the 17 tiles instead of 404'ing.
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attr: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    dark: false,
    label: 'TER',
    maxNative: 17,
    colors: { low: '#0000FF', med: '#FF0000', high: '#8B00FF', ground: '#000000', selected: '#FF6600' },
  },
  toner: {
    // Light base, no labels — clean canvas for printing or for
    // operators who find the dark theme too low-contrast on certain
    // monitors.
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attr: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    dark: false,
    label: 'LGT',
    colors: { low: '#22C55E', med: '#EAB308', high: '#EC4899', ground: '#9CA3AF', selected: '#2563EB' },
  },
};

export const STYLE_ORDER: MapStyle[] = ['dark', 'night', 'satellite', 'streets', 'terrain', 'toner'];
export const TRANSPARENT_TILE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
export const MAX_VISIBLE_MARKERS = 800;
