import type { MapStyle } from '@/lib/types';

interface StyleDef {
  attr: string;
  colors: { ground: string; high: string; low: string; med: string; selected: string };
  dark: boolean;
  label: string;
  maxNative?: number;
  subdomains?: string;
  /**
   * Optional explicit CSS `filter` for this style's basemap tile pane.
   *
   * The `dark` flag alone maps to a single INVERT-based filter
   * (`invert(1) hue-rotate(180deg)…`) that turns LIGHT vector tiles into a
   * dark theme. That recipe is wrong for a photographic raster like Google
   * satellite — inverting a photo yields a colour negative, not a night
   * view. `tileFilter` lets a photographic style opt into a TONE-DOWN
   * filter (dim + cool cast) instead of the invert path, while still
   * being treated as a dark basemap (bright `ALT_ON_DARK` markers, etc.).
   *
   * When set it OVERRIDES the `dark ? invert : none` default in
   * useBaseLayer. Applied only to `tilePane`, so route-glow vectors
   * (overlayPane) and aircraft markers (markerPane) are never dimmed.
   */
  tileFilter?: string;
  url: string;
}

/**
 * Night tone for the photographic satellite basemap. We DIM and slightly
 * de-saturate the bright daytime imagery and lay a cool navy cast over it
 * via `sepia → hue-rotate(to blue) → brightness boost-back` so it reads as
 * an aviation night view that still matches the deep-navy UI shell
 * (`--bg: #06111F`). No blur — coastlines and lit city areas stay legible.
 *
 *   brightness(0.55) — knock the daytime glare down to a night level
 *   contrast(1.05)    — keep landmass/coast edges crisp after dimming
 *   saturate(0.85)    — pull the vivid green terrain toward muted
 *   sepia(0.45) + hue-rotate(176deg) + brightness(1.04) + saturate(1.25)
 *                      — the cool/navy wash: sepia injects a tintable
 *                        mono layer, hue-rotate spins it to blue, the
 *                        small brightness/saturate restore offsets sepia's
 *                        natural darken/wash so the cast stays subtle.
 */
const SATELLITE_NIGHT_FILTER =
  // Calibrated live in Chrome against the mockup's dark-navy night view.
  // Single hard dim (no second brightness to undo it — that was the old bug),
  // muted saturation to kill the daytime green, and a cool navy cast via
  // sepia → hue-rotate. Result reads as a true aviation night basemap.
  'brightness(0.42) contrast(1.12) saturate(0.6) sepia(0.3) hue-rotate(185deg)';

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
// ─── Brand altitude palettes ────────────────────────────────────────────
// One shared palette per basemap brightness so markers + the MapLegend read
// the same cyan/mint/amber language on every style (previously each style had
// its own ad-hoc palette, which is why switching to STR/TER showed
// blue/red/purple). Cyan = high, mint = low, amber = mid.
//   ALT_ON_DARK  — bright, for the dark basemaps (dark / night / satellite).
//   ALT_ON_LIGHT — darkened variants that keep contrast on light basemaps
//                  (streets / terrain / toner).
const ALT_ON_DARK = { low: '#38F2A3', med: '#FBBF24', high: '#00D4FF', ground: '#6B7F99', selected: '#E0F0FF' };
const ALT_ON_LIGHT = { low: '#0FA968', med: '#B45309', high: '#0091C2', ground: '#64748B', selected: '#0B3B66' };

export const MAP_STYLES: Record<MapStyle, StyleDef> = {
  dark: {
    // Pure dark, no labels. Best for "let the markers speak".
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attr: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    dark: false,
    label: 'DRK',
    colors: ALT_ON_DARK,
  },
  night: {
    // Dark base WITH city labels — visibly distinct from DRK. The
    // brighter cyan/magenta palette completes the "night-ops" look.
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attr: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    dark: false,
    label: 'NGT',
    colors: ALT_ON_DARK,
  },
  satellite: {
    // Google satellite tiles, public unauthenticated endpoint via
    // mt0-3.google.com. No API key required for low-volume raster
    // use. The {s} subdomain split keeps the per-host cap from
    // throttling pan/zoom on slower connections.
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attr: '&copy; <a href="https://www.google.com/maps">Google</a>',
    // Treated as a DARK basemap so markers use the bright ALT_ON_DARK
    // palette. The bright daytime imagery is toned to a night view via
    // `tileFilter` below — NOT the default invert (which would negate the
    // photo). See SATELLITE_NIGHT_FILTER for the recipe.
    dark: true,
    tileFilter: SATELLITE_NIGHT_FILTER,
    label: 'SAT',
    // 18 (not 19) to match CONFIG.maxZoom — Leaflet's TileLayer
    // doesn't fetch tiles beyond the user-visible zoom anyway, and
    // mapInteractions.test asserts maxNative <= CONFIG.maxZoom as a
    // sanity check.
    maxNative: 18,
    colors: ALT_ON_DARK,
  },
  streets: {
    // Voyager WITH labels — the typical "Google Maps look".
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    attr: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    dark: false,
    label: 'STR',
    colors: ALT_ON_LIGHT,
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
    colors: ALT_ON_LIGHT,
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
    colors: ALT_ON_LIGHT,
  },
};

export const STYLE_ORDER: MapStyle[] = ['satellite'];
export const TRANSPARENT_TILE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
export const MAX_VISIBLE_MARKERS = 800;
