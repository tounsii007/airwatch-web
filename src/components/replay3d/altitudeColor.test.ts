import { describe, expect, it } from 'vitest';
import { CONVERSION } from '@/lib/constants';
import { altitudeColorRgba } from './altitudeColor';

/** Convert a feet figure to the metres the public API expects. */
const metresAt = (ft: number) => ft / CONVERSION.metersToFeet;

const GREY = [107, 114, 128] as const;
const GREEN = [74, 222, 128] as const;
const AMBER = [251, 191, 36] as const;
const MAGENTA = [232, 121, 168] as const;

describe('altitudeColorRgba', () => {
  it('paints sea-level and below as the grey ground band', () => {
    expect(altitudeColorRgba(0)).toEqual([...GREY, 255]);
    expect(altitudeColorRgba(-50)).toEqual([...GREY, 255]);
  });

  it('keeps anything under 100 ft on the grey ground band', () => {
    expect(altitudeColorRgba(metresAt(50))).toEqual([...GREY, 255]);
  });

  it('uses green below 10k ft', () => {
    expect(altitudeColorRgba(metresAt(5_000))).toEqual([...GREEN, 255]);
    // Just above the ground cut-off is already green.
    expect(altitudeColorRgba(metresAt(150))).toEqual([...GREEN, 255]);
  });

  it('uses amber between 10k and 30k ft', () => {
    expect(altitudeColorRgba(metresAt(20_000))).toEqual([...AMBER, 255]);
  });

  it('uses magenta above 30k ft', () => {
    expect(altitudeColorRgba(metresAt(40_000))).toEqual([...MAGENTA, 255]);
  });

  it('threads the opacity argument into the alpha channel', () => {
    expect(altitudeColorRgba(metresAt(5_000), 128)).toEqual([...GREEN, 128]);
    expect(altitudeColorRgba(0, 0)).toEqual([...GREY, 0]);
  });

  it('defaults the alpha channel to fully opaque', () => {
    expect(altitudeColorRgba(metresAt(20_000))[3]).toBe(255);
  });
});
