import { describe, expect, it } from 'vitest';
import { parseVoiceCommand, type VoiceCommand } from './commandParser';
import type { AppLanguage } from '@/lib/types';

// ─────────────────────────────────────
// English commands
// ─────────────────────────────────────
describe('parseVoiceCommand — English', () => {
  const lang: AppLanguage = 'en';

  it.each([
    ['show flight LH400', { type: 'showFlight', callsign: 'LH400' }],
    ['track EK374', { type: 'showFlight', callsign: 'EK374' }],
    ['find TU744', { type: 'showFlight', callsign: 'TU744' }],
    ['show FR3109', { type: 'showFlight', callsign: 'FR3109' }],
  ] as const)('"%s" → showFlight', (input, expected) => {
    expect(parseVoiceCommand(input, lang)).toEqual(expected);
  });

  it.each([
    ['go to Frankfurt', { type: 'goToAirport', query: 'Frankfurt' }],
    ['show airport London', { type: 'goToAirport', query: 'London' }],
    ['open Istanbul', { type: 'goToAirport', query: 'Istanbul' }],
  ] as const)('"%s" → goToAirport', (input, expected) => {
    expect(parseVoiceCommand(input, lang)).toEqual(expected);
  });

  it('recognizes cargo', () => {
    expect(parseVoiceCommand('show cargo', lang)?.type).toBe('filterCargo');
    expect(parseVoiceCommand('freight flights', lang)?.type).toBe('filterCargo');
  });

  it('recognizes dark/light mode', () => {
    expect(parseVoiceCommand('dark mode', lang)?.type).toBe('setStyleDark');
    expect(parseVoiceCommand('switch to dark', lang)?.type).toBe('setStyleDark');
    expect(parseVoiceCommand('light mode', lang)?.type).toBe('setStyleLight');
  });

  it('recognizes zoom', () => {
    expect(parseVoiceCommand('zoom in', lang)?.type).toBe('zoomIn');
    expect(parseVoiceCommand('zoom out', lang)?.type).toBe('zoomOut');
  });

  it('recognizes radar', () => {
    expect(parseVoiceCommand('show radar', lang)?.type).toBe('toggleRadar');
    expect(parseVoiceCommand('weather', lang)?.type).toBe('toggleRadar');
  });

  it('recognizes turbulence', () => {
    expect(parseVoiceCommand('turbulence', lang)?.type).toBe('toggleTurbulence');
  });

  it('returns null for unknown commands', () => {
    expect(parseVoiceCommand('hello world', lang)).toBeNull();
    expect(parseVoiceCommand('', lang)).toBeNull();
    expect(parseVoiceCommand('  ', lang)).toBeNull();
  });
});

// ─────────────────────────────────────
// German commands
// ─────────────────────────────────────
describe('parseVoiceCommand — German', () => {
  const lang: AppLanguage = 'de';

  it.each([
    ['zeige Flug LH400', { type: 'showFlight', callsign: 'LH400' }],
    ['suche TU744', { type: 'showFlight', callsign: 'TU744' }],
    ['finde EK36', { type: 'showFlight', callsign: 'EK36' }],
  ] as const)('"%s" → showFlight', (input, expected) => {
    expect(parseVoiceCommand(input, lang)).toEqual(expected);
  });

  it.each([
    ['gehe zu Frankfurt', { type: 'goToAirport', query: 'Frankfurt' }],
    ['gehe nach Istanbul', { type: 'goToAirport', query: 'Istanbul' }],
    ['zeige flughafen München', { type: 'goToAirport', query: 'München' }],
  ] as const)('"%s" → goToAirport', (input, expected) => {
    expect(parseVoiceCommand(input, lang)).toEqual(expected);
  });

  it('recognizes cargo', () => {
    expect(parseVoiceCommand('Fracht', lang)?.type).toBe('filterCargo');
    expect(parseVoiceCommand('cargo', lang)?.type).toBe('filterCargo');
  });

  it('recognizes dark/light mode', () => {
    expect(parseVoiceCommand('dunkler Modus', lang)?.type).toBe('setStyleDark');
    expect(parseVoiceCommand('heller Modus', lang)?.type).toBe('setStyleLight');
  });

  it('recognizes zoom', () => {
    expect(parseVoiceCommand('reinzoomen', lang)?.type).toBe('zoomIn');
    expect(parseVoiceCommand('rauszoomen', lang)?.type).toBe('zoomOut');
  });

  it('recognizes turbulenz', () => {
    expect(parseVoiceCommand('Turbulenz', lang)?.type).toBe('toggleTurbulence');
  });
});

// ─────────────────────────────────────
// French commands
// ─────────────────────────────────────
describe('parseVoiceCommand — French', () => {
  const lang: AppLanguage = 'fr';

  it.each([
    ['montre le vol LH400', { type: 'showFlight', callsign: 'LH400' }],
    ['affiche vol EK374', { type: 'showFlight', callsign: 'EK374' }],
    ['cherche TU744', { type: 'showFlight', callsign: 'TU744' }],
  ] as const)('"%s" → showFlight', (input, expected) => {
    expect(parseVoiceCommand(input, lang)).toEqual(expected);
  });

  it.each([
    ['aller à Frankfurt', { type: 'goToAirport', query: 'Frankfurt' }],
    ['montre aéroport Istanbul', { type: 'goToAirport', query: 'Istanbul' }],
  ] as const)('"%s" → goToAirport', (input, expected) => {
    expect(parseVoiceCommand(input, lang)).toEqual(expected);
  });

  it('recognizes cargo', () => {
    expect(parseVoiceCommand('fret', lang)?.type).toBe('filterCargo');
    expect(parseVoiceCommand('cargo', lang)?.type).toBe('filterCargo');
  });

  it('recognizes dark/light mode', () => {
    expect(parseVoiceCommand('mode sombre', lang)?.type).toBe('setStyleDark');
    expect(parseVoiceCommand('mode clair', lang)?.type).toBe('setStyleLight');
  });

  it('recognizes zoom', () => {
    expect(parseVoiceCommand('zoom avant', lang)?.type).toBe('zoomIn');
    expect(parseVoiceCommand('zoom arrière', lang)?.type).toBe('zoomOut');
  });
});

// ─────────────────────────────────────
// Cross-language fallback
// ─────────────────────────────────────
describe('parseVoiceCommand — fallback to English', () => {
  it('DE falls back to EN for English commands', () => {
    expect(parseVoiceCommand('show flight LH400', 'de')?.type).toBe('showFlight');
  });

  it('FR falls back to EN for English commands', () => {
    expect(parseVoiceCommand('zoom in', 'fr')?.type).toBe('zoomIn');
  });
});

// ─────────────────────────────────────
// Case insensitivity
// ─────────────────────────────────────
describe('parseVoiceCommand — case insensitivity', () => {
  it('handles uppercase input', () => {
    expect(parseVoiceCommand('SHOW FLIGHT LH400', 'en')?.type).toBe('showFlight');
  });

  it('handles mixed case', () => {
    expect(parseVoiceCommand('Show Flight lh400', 'en')).toEqual({ type: 'showFlight', callsign: 'LH400' });
  });
});
