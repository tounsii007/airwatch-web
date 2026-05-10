import { describe, expect, it } from 'vitest';
import { dirAttr, isRtl, RTL_LANGUAGES } from './rtl';

describe('rtl helpers', () => {
  it('isRtl returns true for arabic only', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(isRtl('de')).toBe(false);
    expect(isRtl('fr')).toBe(false);
    expect(isRtl('es')).toBe(false);
    expect(isRtl('it')).toBe(false);
  });

  it('dirAttr returns "rtl" for RTL languages and "ltr" otherwise', () => {
    expect(dirAttr('ar')).toBe('rtl');
    expect(dirAttr('en')).toBe('ltr');
    expect(dirAttr('it')).toBe('ltr');
  });

  it('RTL_LANGUAGES set has stable membership', () => {
    // The set membership must not silently expand without code review;
    // this test is the canary if someone adds a language without
    // updating both the type union and the set.
    expect([...RTL_LANGUAGES]).toEqual(['ar']);
  });
});
