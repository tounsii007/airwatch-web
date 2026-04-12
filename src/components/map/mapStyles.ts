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
 * All tile URLs use "no labels" variants.
 * Airport labels are rendered by our own useAirportLabels hook.
 */
export const MAP_STYLES: Record<MapStyle, StyleDef> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO &copy; OSM',
    dark: false,
    subdomains: 'abcd',
    label: 'DRK',
    colors: { low: '#4ADE80', med: '#FBBF24', high: '#E879A8', ground: '#6B7280', selected: '#E0F0FF' },
  },
  night: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO',
    dark: false,
    subdomains: 'abcd',
    label: 'NGT',
    colors: { low: '#00FF88', med: '#FF9500', high: '#FF3B7A', ground: '#555555', selected: '#FFFFFF' },
  },
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attr: '&copy; Google',
    dark: false,
    subdomains: '0123',
    label: 'SAT',
    colors: { low: '#00FF66', med: '#FFD700', high: '#FF4488', ground: '#AAAAAA', selected: '#FFFFFF' },
  },
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO &copy; OSM',
    dark: false,
    subdomains: 'abcd',
    label: 'STR',
    colors: { low: '#0066FF', med: '#CC0000', high: '#9900CC', ground: '#333333', selected: '#FF6600' },
  },
  terrain: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO &copy; OSM',
    dark: false,
    subdomains: 'abcd',
    label: 'TER',
    colors: { low: '#0000FF', med: '#FF0000', high: '#8B00FF', ground: '#000000', selected: '#FF6600' },
  },
  toner: {
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
    attr: '&copy; CARTO',
    dark: false,
    subdomains: 'abcd',
    label: 'LGT',
    colors: { low: '#22C55E', med: '#EAB308', high: '#EC4899', ground: '#9CA3AF', selected: '#2563EB' },
  },
};

export const STYLE_ORDER: MapStyle[] = ['dark', 'night', 'satellite', 'streets', 'terrain', 'toner'];
export const TRANSPARENT_TILE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
export const MAX_VISIBLE_MARKERS = 800;
