// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BUDGETS,
  LAZY_3D_MARKERS,
  classify,
  computeVerdict,
  fmt,
} from './bundle-budget-lib.mjs';

describe('fmt', () => {
  it('renders bytes / kilobytes / megabytes with the right unit', () => {
    expect(fmt(0)).toBe('0 B');
    expect(fmt(512)).toBe('512 B');
    expect(fmt(1024)).toBe('1.0 KB');
    expect(fmt(1500)).toBe('1.5 KB');
    expect(fmt(1024 * 1024)).toBe('1.00 MB');
    expect(fmt(2.5 * 1024 * 1024)).toBe('2.50 MB');
  });
});

describe('classify', () => {
  it('marks chunks containing "Cesium" as lazy3d with the globe reason', () => {
    const result = classify('var x = window.Cesium; export default x;');
    expect(result.bucket).toBe('lazy3d');
    expect(result.reason).toMatch(/Cesium/);
  });

  it('marks chunks containing "deck.gl" as lazy3d with the replay reason', () => {
    const result = classify('import { ScatterplotLayer } from "@deck.gl/layers";');
    expect(result.bucket).toBe('lazy3d');
    expect(result.reason).toMatch(/deck\.gl/);
  });

  it('treats plain JS without a marker as core', () => {
    const result = classify('export const greet = () => "hi";');
    expect(result.bucket).toBe('core');
    expect(result.reason).toMatch(/shared/);
  });

  it('accepts a Buffer-like input', () => {
    const buf = Buffer.from('Cesium something');
    expect(classify(buf).bucket).toBe('lazy3d');
  });

  it('first matching marker wins (Cesium before @deck.gl)', () => {
    expect(classify('Cesium and @deck.gl both').reason).toMatch(/Cesium/);
  });
});

describe('computeVerdict', () => {
  const baseChunks = [
    { name: 'core1.js', gzipSize: 200 * 1024, bucket: 'core' },
    { name: 'core2.js', gzipSize: 300 * 1024, bucket: 'core' },
    { name: 'cesium.js', gzipSize: 1_200 * 1024, bucket: 'lazy3d' },
  ];

  it('totals each bucket independently and tracks the largest single chunk', () => {
    const v = computeVerdict({ chunks: baseChunks, cssBytes: 50 * 1024 });
    expect(v.coreTotal).toBe(500 * 1024);
    expect(v.lazyTotal).toBe(1_200 * 1024);
    expect(v.largestChunkGzip).toBe(1_200 * 1024);
    expect(v.cssBytes).toBe(50 * 1024);
  });

  it('returns ok=true when every total is under budget', () => {
    const v = computeVerdict({ chunks: baseChunks, cssBytes: 50 * 1024 });
    expect(v.ok).toBe(true);
    expect(v.failures).toHaveLength(0);
  });

  it('lists every breached budget on failure', () => {
    const v = computeVerdict({
      chunks: [
        { name: 'big-core.js',  gzipSize: 1_500 * 1024, bucket: 'core' },
        { name: 'big-lazy.js',  gzipSize: 2_000 * 1024, bucket: 'lazy3d' },
      ],
      cssBytes: 200 * 1024,
    });
    expect(v.ok).toBe(false);
    expect(v.failures.map((f) => f.name)).toEqual(
      expect.arrayContaining(['Core', 'Lazy 3D', 'Largest chunk', 'CSS (raw)']),
    );
  });

  it('honours custom budgets so callers can preview a tightened limit', () => {
    const v = computeVerdict({
      chunks: baseChunks,
      cssBytes: 50 * 1024,
      budgets: { ...DEFAULT_BUDGETS, core: 100 * 1024 },
    });
    expect(v.ok).toBe(false);
    expect(v.failures[0]).toMatchObject({ name: 'Core', limit: 100 * 1024 });
  });
});

describe('LAZY_3D_MARKERS catalog', () => {
  it('has at least one entry per heavy library currently in the app', () => {
    const needles = LAZY_3D_MARKERS.map((m) => m.needle);
    expect(needles).toContain('Cesium');
    // Either form of deck.gl is fine — the script matches both.
    expect(needles.some((n) => n.includes('deck.gl'))).toBe(true);
  });

  it('every marker has a non-empty reason string', () => {
    for (const m of LAZY_3D_MARKERS) {
      expect(m.reason).toBeTruthy();
      expect(m.reason.length).toBeGreaterThan(5);
    }
  });
});
