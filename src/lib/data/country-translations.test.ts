import { describe, it, expect } from 'vitest';
import {
  codeToCountryName,
  countryNameMatches,
  countryToCode,
  knownCountries,
  localizeCountry,
  resolveCountryAlias,
} from '@/lib/data/country-translations';

describe('localizeCountry', () => {
  it('returns the English name unchanged for en locale', () => {
    expect(localizeCountry('Tunisia', 'en')).toBe('Tunisia');
    expect(localizeCountry('Germany', 'en')).toBe('Germany');
  });

  it('translates Tunisia across every supported locale', () => {
    expect(localizeCountry('Tunisia', 'de')).toBe('Tunesien');
    expect(localizeCountry('Tunisia', 'fr')).toBe('Tunisie');
    expect(localizeCountry('Tunisia', 'es')).toBe('Túnez');
    expect(localizeCountry('Tunisia', 'it')).toBe('Tunisia');
    expect(localizeCountry('Tunisia', 'ar')).toBe('تونس');
    expect(localizeCountry('Tunisia', 'pl')).toBe('Tunezja');
    expect(localizeCountry('Tunisia', 'nl')).toBe('Tunesië');
    expect(localizeCountry('Tunisia', 'tr')).toBe('Tunus');
  });

  it('translates Germany across every supported locale', () => {
    expect(localizeCountry('Germany', 'de')).toBe('Deutschland');
    expect(localizeCountry('Germany', 'fr')).toBe('Allemagne');
    expect(localizeCountry('Germany', 'es')).toBe('Alemania');
    expect(localizeCountry('Germany', 'it')).toBe('Germania');
    expect(localizeCountry('Germany', 'ar')).toBe('ألمانيا');
    expect(localizeCountry('Germany', 'pl')).toBe('Niemcy');
    expect(localizeCountry('Germany', 'nl')).toBe('Duitsland');
    expect(localizeCountry('Germany', 'tr')).toBe('Almanya');
  });

  it('handles canonical-form variants ("UK" / "United Kingdom")', () => {
    expect(localizeCountry('UK', 'de')).toBe('Vereinigtes Königreich');
    expect(localizeCountry('United Kingdom', 'de')).toBe('Vereinigtes Königreich');
    expect(localizeCountry('USA', 'fr')).toBe('États-Unis');
    expect(localizeCountry('United States', 'fr')).toBe('États-Unis');
  });

  it('falls back to the input when the country is unknown', () => {
    expect(localizeCountry('Atlantis', 'de')).toBe('Atlantis');
    expect(localizeCountry('', 'de')).toBe('');
  });

  it('is tolerant of mixed casing and trailing whitespace', () => {
    expect(localizeCountry('tunisia', 'de')).toBe('Tunesien');
    expect(localizeCountry(' Germany ', 'fr')).toBe('Allemagne');
  });
});

describe('resolveCountryAlias', () => {
  it('resolves Tunisia from every locale variant', () => {
    expect(resolveCountryAlias('Tunesien')).toBe('Tunisia');     // DE
    expect(resolveCountryAlias('tunisia')).toBe('Tunisia');      // EN (case-insensitive)
    expect(resolveCountryAlias('Tunisie')).toBe('Tunisia');      // FR
    expect(resolveCountryAlias('Túnez')).toBe('Tunisia');        // ES
    expect(resolveCountryAlias('Tunisia')).toBe('Tunisia');      // IT
    expect(resolveCountryAlias('تونس')).toBe('Tunisia');         // AR
    expect(resolveCountryAlias('Tunezja')).toBe('Tunisia');      // PL
    expect(resolveCountryAlias('Tunesië')).toBe('Tunisia');      // NL
    expect(resolveCountryAlias('Tunus')).toBe('Tunisia');        // TR
  });

  it('resolves Germany from every locale variant', () => {
    expect(resolveCountryAlias('Deutschland')).toBe('Germany');
    expect(resolveCountryAlias('Germany')).toBe('Germany');
    expect(resolveCountryAlias('Allemagne')).toBe('Germany');
    expect(resolveCountryAlias('Alemania')).toBe('Germany');
    expect(resolveCountryAlias('Germania')).toBe('Germany');
    expect(resolveCountryAlias('ألمانيا')).toBe('Germany');
    expect(resolveCountryAlias('Niemcy')).toBe('Germany');
    expect(resolveCountryAlias('Duitsland')).toBe('Germany');
    expect(resolveCountryAlias('Almanya')).toBe('Germany');
  });

  it('resolves Türkiye / Türkei / Turkey / Turquía from any locale', () => {
    expect(resolveCountryAlias('Turkey')).toBe('Turkey');
    expect(resolveCountryAlias('Türkei')).toBe('Turkey');
    expect(resolveCountryAlias('Türkiye')).toBe('Turkey');
    expect(resolveCountryAlias('Turquie')).toBe('Turkey');
    expect(resolveCountryAlias('Turquía')).toBe('Turkey');
    expect(resolveCountryAlias('Turchia')).toBe('Turkey');
    expect(resolveCountryAlias('تركيا')).toBe('Turkey');
    expect(resolveCountryAlias('Turcja')).toBe('Turkey');
    expect(resolveCountryAlias('Turkije')).toBe('Turkey');
  });

  it('is diacritics-insensitive', () => {
    // "Tunez" without accent must resolve to Tunisia (es alias is "Túnez").
    expect(resolveCountryAlias('Tunez')).toBe('Tunisia');
    // German "Türkei" without umlaut.
    expect(resolveCountryAlias('Turkei')).toBe('Turkey');
    // "Aegypten" — Ägypten without umlaut.
    expect(resolveCountryAlias('Agypten')).toBe('Egypt');
  });

  it('returns null for unknown queries', () => {
    expect(resolveCountryAlias('Wakanda')).toBeNull();
    expect(resolveCountryAlias('')).toBeNull();
  });

  it('resolves Greek / Spanish / Italian / Dutch / Polish countries', () => {
    expect(resolveCountryAlias('Griechenland')).toBe('Greece');
    expect(resolveCountryAlias('Grecja')).toBe('Greece');
    expect(resolveCountryAlias('Hiszpania')).toBe('Spain');
    expect(resolveCountryAlias('Spagna')).toBe('Spain');
    expect(resolveCountryAlias('Włochy')).toBe('Italy');
    expect(resolveCountryAlias('Italië')).toBe('Italy');
    expect(resolveCountryAlias('Brasilien')).toBe('Brazil');
    expect(resolveCountryAlias('Brésil')).toBe('Brazil');
  });

  it('resolves Asian country aliases', () => {
    expect(resolveCountryAlias('Japon')).toBe('Japan');
    expect(resolveCountryAlias('Giappone')).toBe('Japan');
    expect(resolveCountryAlias('اليابان')).toBe('Japan');
    expect(resolveCountryAlias('Südkorea')).toBe('South Korea');
    expect(resolveCountryAlias('Corée du Sud')).toBe('South Korea');
    expect(resolveCountryAlias('Indien')).toBe('India');
    expect(resolveCountryAlias('Inde')).toBe('India');
    expect(resolveCountryAlias('Chine')).toBe('China');
    expect(resolveCountryAlias('Tayland')).toBe('Thailand');
  });
});

describe('countryNameMatches — substring across locales', () => {
  it('matches a partial German query against the canonical English', () => {
    // User starts typing "Tunes" — should hit Tunisia (DE: Tunesien).
    expect(countryNameMatches('Tunisia', 'Tunes')).toBe(true);
    expect(countryNameMatches('Tunisia', 'tun')).toBe(true);
  });

  it('matches a partial French query', () => {
    expect(countryNameMatches('Germany', 'allem')).toBe(true);
    expect(countryNameMatches('UK', 'royaume')).toBe(true);
  });

  it('matches Arabic / Polish queries on the canonical English', () => {
    expect(countryNameMatches('Tunisia', 'تونس')).toBe(true);
    expect(countryNameMatches('Germany', 'Niemcy')).toBe(true);
  });

  it('rejects unrelated queries', () => {
    expect(countryNameMatches('Tunisia', 'Berlin')).toBe(false);
    expect(countryNameMatches('Germany', 'tunisie')).toBe(false);
  });

  it('handles empty input gracefully', () => {
    expect(countryNameMatches('Tunisia', '')).toBe(false);
  });

  it('falls back to substring match on the raw English when country is unknown', () => {
    expect(countryNameMatches('Wakanda', 'wakan')).toBe(true);
    expect(countryNameMatches('Wakanda', 'xyz')).toBe(false);
  });
});

describe('countryToCode / codeToCountryName', () => {
  it('maps canonical names to ISO-2 codes', () => {
    expect(countryToCode('Tunisia')).toBe('tn');
    expect(countryToCode('Germany')).toBe('de');
    expect(countryToCode('USA')).toBe('us');
    expect(countryToCode('United States')).toBe('us');
    expect(countryToCode('UK')).toBe('gb');
    expect(countryToCode('United Kingdom')).toBe('gb');
  });

  it('passes through two-letter input unchanged (lowercased)', () => {
    expect(countryToCode('DE')).toBe('de');
    expect(countryToCode('us')).toBe('us');
  });

  it('returns "" for unknown country names', () => {
    expect(countryToCode('Wakanda')).toBe('');
    expect(countryToCode('')).toBe('');
  });

  it('reverses ISO-2 to canonical English', () => {
    expect(codeToCountryName('tn')).toBe('Tunisia');
    expect(codeToCountryName('DE')).toBe('Germany');
    expect(codeToCountryName('fr')).toBe('France');
    // USA wins over United States because it was declared first in NAME_TO_CODE.
    expect(codeToCountryName('us')).toBe('USA');
  });

  it('falls back to uppercase code for unknown ISO-2 inputs', () => {
    expect(codeToCountryName('xx')).toBe('XX');
    expect(codeToCountryName('')).toBe('');
  });
});

describe('knownCountries', () => {
  it('includes the airline-catalogue countries used in the live data', () => {
    const names = new Set(knownCountries());
    // Spot-check the countries that have airlines in the static catalogue.
    expect(names.has('Tunisia')).toBe(true);
    expect(names.has('Germany')).toBe(true);
    expect(names.has('UAE')).toBe(true);
    expect(names.has('South Korea')).toBe(true);
    expect(names.has('Hong Kong')).toBe(true);
    expect(names.has('New Caledonia')).toBe(true);
    expect(names.has('Sri Lanka')).toBe(true);
  });
});
