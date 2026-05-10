// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decodeMetar, decodeTaf, phenomenonLabel, phenomenonText } from './metarDecode';

describe('decodeMetar', () => {
  it('parses a textbook EDDF observation', () => {
    const got = decodeMetar('METAR EDDF 101050Z 23010KT 9999 FEW040 SCT080 17/12 Q1014 NOSIG');
    expect(got.station).toBe('EDDF');
    expect(got.observed).toBe('10 10:50Z');
    expect(got.wind).toEqual({ direction: 230, speed: 10, gust: null, unit: 'KT', variable: false });
    expect(got.visibility).toEqual({ value: '≥10', unit: 'm' });
    expect(got.cloudLayers).toEqual([
      { cover: 'FEW', baseFt: 4000, type: null },
      { cover: 'SCT', baseFt: 8000, type: null },
    ]);
    expect(got.temperature).toEqual({ tempC: 17, dewC: 12 });
    expect(got.altimeter.hPa).toBe(1014);
    expect(got.unknown).toContain('NOSIG');
  });

  it('parses a US-style stat-mile + inHg report', () => {
    const got = decodeMetar('KSFO 101056Z 26012G18KT 10SM FEW010 SCT200 14/10 A3001');
    expect(got.station).toBe('KSFO');
    expect(got.wind).toEqual({ direction: 260, speed: 12, gust: 18, unit: 'KT', variable: false });
    expect(got.visibility).toEqual({ value: 10, unit: 'SM' });
    expect(got.altimeter.inHg).toBe(30.01);
    expect(got.cloudLayers.length).toBe(2);
  });

  it('parses CAVOK + AUTO modifier', () => {
    const got = decodeMetar('KORD 101055Z AUTO 27008KT CAVOK 18/14 Q1015');
    expect(got.modifier).toBe('AUTO');
    expect(got.visibility).toEqual({ value: 'CAVOK', unit: 'CAVOK' });
    expect(got.cloudLayers).toEqual([{ cover: 'CAVOK', baseFt: null, type: null }]);
  });

  it('parses negative temperature and dew (M-prefix)', () => {
    const got = decodeMetar('UUEE 110900Z 14004MPS 9999 OVC008 M03/M05 Q1010');
    expect(got.temperature).toEqual({ tempC: -3, dewC: -5 });
    expect(got.wind?.unit).toBe('MPS');
  });

  it('parses gusty + variable wind ("VRB04KT")', () => {
    const got = decodeMetar('LFPG 101030Z VRB04KT 6000 SCT020 19/14 Q1013');
    expect(got.wind).toEqual({ direction: null, speed: 4, gust: null, unit: 'KT', variable: true });
  });

  it('detects calm wind ("00000KT")', () => {
    const got = decodeMetar('EDDB 101100Z 00000KT 9999 NCD 12/10 Q1015');
    expect(got.wind).toEqual({ direction: null, speed: 0, gust: null, unit: 'KT', variable: true });
  });

  it('parses cumulonimbus cloud type', () => {
    const got = decodeMetar('KMIA 101053Z 12015KT 6SM TSRA SCT020CB BKN040 27/24 A2987');
    const cb = got.cloudLayers.find((c) => c.type === 'CB');
    expect(cb?.baseFt).toBe(2000);
    // TSRA → ["TS","RA"] each as a separate phenomenon. The combined token
    // must be split.
    expect(got.phenomena.map((p) => p.code)).toContain('TS');
    expect(got.phenomena.map((p) => p.code)).toContain('RA');
  });

  it('keeps unknown tokens in the unknown bucket without dropping data', () => {
    const got = decodeMetar('KLAX 101053Z 24010KT 10SM FU 22/14 A2998 RMK SLP155');
    expect(got.unknown.some((u) => u.startsWith('RMK'))).toBe(true);
  });

  it('parses fractional statute-mile visibility', () => {
    const got = decodeMetar('KORD 110055Z 09003KT 1/2SM FG VV001 18/18 A2998');
    expect(got.visibility).toEqual({ value: 0.5, unit: 'SM' });
    expect(got.phenomena.some((p) => p.code === 'FG')).toBe(true);
  });

  it('returns the raw string for round-trip display', () => {
    const raw = 'EDDF 101050Z 23010KT 9999 FEW040 17/12 Q1014';
    expect(decodeMetar(raw).raw).toBe(raw);
  });
});

describe('phenomenonLabel + phenomenonText', () => {
  it('maps codes to their human label', () => {
    expect(phenomenonLabel('TS')).toBe('thunderstorm');
    expect(phenomenonLabel('FG')).toBe('fog');
    expect(phenomenonLabel('WTF')).toBe('WTF'); // unknown → echo
  });

  it('combines intensity with label', () => {
    expect(phenomenonText({ intensity: '-', code: 'RA' })).toBe('light rain');
    expect(phenomenonText({ intensity: '+', code: 'SN' })).toBe('heavy snow');
    expect(phenomenonText({ intensity: 'VC', code: 'TS' })).toBe('in vicinity: thunderstorm');
    expect(phenomenonText({ intensity: null, code: 'BR' })).toBe('mist');
  });
});

// METAR splits a token into multiple codes — TS RA SH etc. share a token.
// The current implementation matches the leading 2-letter code; double-
// codes need to be either pre-split or matched as a sequence. Test below
// pins the contract that BOTH appear in the output.
describe('decodeMetar — multi-code phenomena tokens', () => {
  it('splits TSRA into TS + RA', () => {
    // Implementation detail: scan a known prefix, then recurse on the tail.
    // If this breaks, the assertion fails — fix forward, don't relax.
    const got = decodeMetar('KMIA 101053Z 12015KT 6SM TSRA SCT020CB 27/24 A2987');
    const codes = got.phenomena.map((p) => p.code);
    expect(codes).toEqual(expect.arrayContaining(['TS', 'RA']));
  });
});

describe('decodeTaf', () => {
  it('parses a header + initial conditions + FM group', () => {
    const raw = 'TAF EDDF 101100Z 1012/1118 24008KT 9999 SCT040 FM101400 25012KT 9999 BKN040';
    const got = decodeTaf(raw);
    expect(got.station).toBe('EDDF');
    expect(got.validFrom).toBe('1012');
    expect(got.validTo).toBe('1118');
    expect(got.windows.length).toBeGreaterThanOrEqual(2);
    const initial = got.windows[0];
    expect(initial.label).toBe('INITIAL');
    expect(initial.conditions.wind?.speed).toBe(8);
    const fm = got.windows[1];
    expect(fm.label).toBe('FM');
    expect(fm.when).toBe('101400');
    expect(fm.conditions.wind?.speed).toBe(12);
  });

  it('parses TEMPO + period', () => {
    const raw = 'TAF EDDF 101100Z 1012/1118 24008KT 9999 SCT040 TEMPO 1014/1018 -RA BKN020';
    const got = decodeTaf(raw);
    const tempo = got.windows.find((w) => w.label === 'TEMPO');
    expect(tempo).toBeDefined();
    expect(tempo!.when).toBe('1014/1018');
    expect(tempo!.conditions.phenomena.some((p) => p.code === 'RA' && p.intensity === '-')).toBe(true);
  });

  it('parses PROB30 group', () => {
    const raw = 'TAF KORD 101100Z 1012/1112 24008KT P6SM SCT040 PROB30 1014/1018 1/2SM FG OVC003';
    const got = decodeTaf(raw);
    const prob = got.windows.find((w) => w.label === 'PROB30');
    expect(prob).toBeDefined();
    expect(prob!.when).toBe('1014/1018');
  });

  it('returns the raw string', () => {
    const raw = 'TAF KORD 101100Z 1012/1112 24008KT';
    expect(decodeTaf(raw).raw).toBe(raw);
  });
});
