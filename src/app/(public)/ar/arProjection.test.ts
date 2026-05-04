import { describe, expect, it } from 'vitest';
import { projectToScreen, type Viewport } from '@/app/(public)/ar/arProjection';

const VIEWPORT: Viewport = {
  width: 400,
  height: 800,
  fovHorizontalDeg: 60,
  fovVerticalDeg: 80,
};

describe('projectToScreen', () => {
  it('places a target directly ahead and at horizon level at screen centre', () => {
    const p = projectToScreen(0, 0, { heading: 0, pitch: 0 }, VIEWPORT);
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(400);
    expect(p.inView).toBe(true);
  });

  it('maps a target at the right edge of the horizontal FOV to the right edge', () => {
    const p = projectToScreen(30, 0, { heading: 0, pitch: 0 }, VIEWPORT);
    expect(p.x).toBeCloseTo(400);
    expect(p.inView).toBe(true);
  });

  it('maps a target higher than the camera above the vertical centre', () => {
    const p = projectToScreen(0, 20, { heading: 0, pitch: 0 }, VIEWPORT);
    expect(p.y).toBeLessThan(400);
  });

  it('flags a target outside the FOV as not in view', () => {
    const p = projectToScreen(120, 0, { heading: 0, pitch: 0 }, VIEWPORT);
    expect(p.inView).toBe(false);
  });

  it('follows the camera heading — rotating 30° brings an east target to centre', () => {
    const p = projectToScreen(30, 0, { heading: 30, pitch: 0 }, VIEWPORT);
    expect(p.x).toBeCloseTo(200);
    expect(p.inView).toBe(true);
  });
});
