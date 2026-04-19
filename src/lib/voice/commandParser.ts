import type { AppLanguage } from '@/lib/types';

export type VoiceCommand =
  | { type: 'showFlight'; callsign: string }
  | { type: 'goToAirport'; query: string }
  | { type: 'filterCargo' }
  | { type: 'setStyleDark' }
  | { type: 'setStyleLight' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'toggleRadar' }
  | { type: 'toggleTurbulence' };

interface Pattern {
  regex: RegExp;
  build: (match: RegExpMatchArray) => VoiceCommand;
}

const PATTERNS_EN: Pattern[] = [
  { regex: /(?:show|track|find)\s+(?:flight\s+)?([A-Z]{2,3}\d{1,5})/i, build: (m) => ({ type: 'showFlight', callsign: m[1].toUpperCase() }) },
  { regex: /(?:show\s+)?cargo|freight/i, build: () => ({ type: 'filterCargo' }) },
  { regex: /dark\s+mode|switch.*dark/i, build: () => ({ type: 'setStyleDark' }) },
  { regex: /light\s+mode|switch.*light/i, build: () => ({ type: 'setStyleLight' }) },
  { regex: /zoom\s+in|closer/i, build: () => ({ type: 'zoomIn' }) },
  { regex: /zoom\s+out|further/i, build: () => ({ type: 'zoomOut' }) },
  { regex: /\bradar\b|\bweather\b/i, build: () => ({ type: 'toggleRadar' }) },
  { regex: /turbulence/i, build: () => ({ type: 'toggleTurbulence' }) },
  // goToAirport must be LAST (greedy catch-all)
  { regex: /(?:go\s+to|show|open)\s+(?:airport\s+)?(\w{3,})/i, build: (m) => ({ type: 'goToAirport', query: m[1] }) },
];

const PATTERNS_DE: Pattern[] = [
  { regex: /(?:zeige?|suche?|finde?)\s+(?:flug\s+)?([A-Z]{2,3}\d{1,5})/i, build: (m) => ({ type: 'showFlight', callsign: m[1].toUpperCase() }) },
  { regex: /fracht|cargo/i, build: () => ({ type: 'filterCargo' }) },
  { regex: /dunkel|dunkler?\s+modus/i, build: () => ({ type: 'setStyleDark' }) },
  { regex: /hell|heller?\s+modus/i, build: () => ({ type: 'setStyleLight' }) },
  { regex: /(?:rein|näher)\s*zoom|vergrößer/i, build: () => ({ type: 'zoomIn' }) },
  { regex: /(?:raus|weiter)\s*zoom|verklein/i, build: () => ({ type: 'zoomOut' }) },
  { regex: /\bradar\b|\bwetter\b/i, build: () => ({ type: 'toggleRadar' }) },
  { regex: /turbulenz/i, build: () => ({ type: 'toggleTurbulence' }) },
  // Airport: capture word after "flughafen" or after navigation verbs
  { regex: /(?:gehe?\s+(?:zu|nach)|öffne?)\s+(\S{3,})/i, build: (m) => ({ type: 'goToAirport', query: m[1] }) },
  { regex: /(?:zeige?)\s+flughafen\s+(\S{3,})/i, build: (m) => ({ type: 'goToAirport', query: m[1] }) },
];

const PATTERNS_FR: Pattern[] = [
  { regex: /(?:montre|affiche|cherche|trouve)\s+(?:(?:le\s+)?vol\s+)?([A-Z]{2,3}\d{1,5})/i, build: (m) => ({ type: 'showFlight', callsign: m[1].toUpperCase() }) },
  { regex: /(?:aller?\s+[àa]|montre|ouvre)\s+(?:(?:l')?a[ée]roport\s+)?(\w{3,})/i, build: (m) => ({ type: 'goToAirport', query: m[1] }) },
  { regex: /fret|cargo/i, build: () => ({ type: 'filterCargo' }) },
  { regex: /mode\s+sombre|sombre/i, build: () => ({ type: 'setStyleDark' }) },
  { regex: /mode\s+clair|clair/i, build: () => ({ type: 'setStyleLight' }) },
  { regex: /zoom\s+(?:avant|plus)/i, build: () => ({ type: 'zoomIn' }) },
  { regex: /zoom\s+(?:arri[eè]re|moins)/i, build: () => ({ type: 'zoomOut' }) },
  { regex: /radar|m[ée]t[ée]o/i, build: () => ({ type: 'toggleRadar' }) },
  { regex: /turbulence/i, build: () => ({ type: 'toggleTurbulence' }) },
];

const PATTERNS: Record<AppLanguage, Pattern[]> = {
  en: PATTERNS_EN,
  de: PATTERNS_DE,
  fr: PATTERNS_FR,
};

/**
 * Parse a voice transcript into a typed command.
 * Returns null if no command matched.
 */
export function parseVoiceCommand(transcript: string, language: AppLanguage): VoiceCommand | null {
  const patterns = PATTERNS[language] ?? PATTERNS_EN;
  const text = transcript.trim();
  if (!text) return null;

  for (const { regex, build } of patterns) {
    const match = text.match(regex);
    if (match) return build(match);
  }

  // Fallback: try English patterns if non-English didn't match
  if (language !== 'en') {
    for (const { regex, build } of PATTERNS_EN) {
      const match = text.match(regex);
      if (match) return build(match);
    }
  }

  return null;
}
