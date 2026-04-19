import { describe, expect, it } from 'vitest';
import { bearingDeg, elevationAngleDeg, normalizeDeg, shortestAngleDiff } from '@/app/ar/arMath';

describe('normalizeDeg', () => {
  it('wraps negatives into [0, 360)', () => {
    expect(normalizeDeg(-10)).toBeCloseTo(350);
    expect(normalizeDeg(-370)).toBeCloseTo(350);
  });

  it('wraps values > 360', () => {
    expect(normalizeDeg(450)).toBeCloseTo(90);
  });

  it('leaves in-range values alone', () => {
    expect(normalizeDeg(123)).toBeCloseTo(123);
  });
});

describe('shortestAngleDiff', () => {
  it('returns 0 for the same angle', () => {
    expect(shortestAngleDiff(45, 45)).toBe(0);
  });

  it('picks the shorter direction across the 0°/360° boundary', () => {
    expect(shortestAngleDiff(350, 10)).toBe(20);
    expect(shortestAngleDiff(10, 350)).toBe(-20);
  });

  it('is signed (left-negative, right-positive)', () => {
    expect(shortestAngleDiff(90, 180)).toBe(90);
    expect(shortestAngleDiff(180, 90)).toBe(-90);
  });
});

describe('bearingDeg', () => {
  it('due north from equator', () => {
    expect(bearingDeg(0, 0, 10, 0)).toBeCloseTo(0, 1);
  });

  it('due east from equator', () => {
    expect(bearingDeg(0, 0, 0, 10)).toBeCloseTo(90, 1);
  });

  it('due south from equator', () => {
    expect(bearingDeg(0, 0, -10, 0)).toBeCloseTo(180, 1);
  });

  it('due west from equator', () => {
    expect(bearingDeg(0, 0, 0, -10)).toBeCloseTo(270, 1);
  });
});

describe('elevationAngleDeg', () => {
  it('returns 90° when the aircraft is directly overhead', () => {
    expect(elevationAngleDeg(10_000, 0)).toBe(90);
  });

  it('returns 45° when altitude (km) equals ground distance (km)', () => {
    expect(elevationAngleDeg(10_000, 10)).toBeCloseTo(45, 1);
  });

  it('approaches 0° for far, low aircraft', () => {
    expect(elevationAngleDeg(1_000, 100)).toBeLessThan(1);
  });
});
