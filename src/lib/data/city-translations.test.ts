import { describe, it, expect } from 'vitest';
import {
  localizeCity,
  cityNameMatches,
  resolveCityAlias,
} from '@/lib/data/city-translations';

/**
 * Unit tests for the static (bundled) portion of the city-translations module.
 * The dynamic {@link loadCityI18n} layer is exercised indirectly by the airport
 * search tests and by a separate browser-level smoke test.
 */
describe('localizeCity', () => {
  it('returns the English name unchanged for en locale', () => {
    expect(localizeCity('Nice', 'en')).toBe('Nice');
    expect(localizeCity('Cologne', 'en')).toBe('Cologne');
  });

  it('translates well-known cities to German', () => {
    expect(localizeCity('Nice', 'de')).toBe('Nizza');
    expect(localizeCity('Cologne', 'de')).toBe('Köln');
    expect(localizeCity('Munich', 'de')).toBe('München');
    expect(localizeCity('Vienna', 'de')).toBe('Wien');
    expect(localizeCity('Tokyo', 'de')).toBe('Tokio');
  });

  it('translates well-known cities to French', () => {
    expect(localizeCity('London', 'fr')).toBe('Londres');
    expect(localizeCity('Geneva', 'fr')).toBe('Genève');
    expect(localizeCity('Vienna', 'fr')).toBe('Vienne');
    expect(localizeCity('Athens', 'fr')).toBe('Athènes');
  });

  it('covers the Asia / Middle East / Africa airport hubs', () => {
    expect(localizeCity('Seoul',       'fr')).toBe('Séoul');
    expect(localizeCity('Singapore',   'de')).toBe('Singapur');
    expect(localizeCity('Singapore',   'fr')).toBe('Singapour');
    expect(localizeCity('Dubai',       'fr')).toBe('Dubaï');
    expect(localizeCity('Beijing',     'de')).toBe('Peking');
    expect(localizeCity('Beijing',     'fr')).toBe('Pékin');
    expect(localizeCity('Shanghai',    'de')).toBe('Schanghai');
    expect(localizeCity('Hong Kong',   'de')).toBe('Hongkong');
    expect(localizeCity('Kolkata',     'de')).toBe('Kalkutta');
    expect(localizeCity('Mumbai',      'fr')).toBe('Bombay');
    expect(localizeCity('Cape Town',   'de')).toBe('Kapstadt');
    expect(localizeCity('Cape Town',   'fr')).toBe('Le Cap');
    expect(localizeCity('Johannesburg','fr')).toBe('Johannesbourg');
    expect(localizeCity('Tel Aviv',    'fr')).toBe('Tel-Aviv');
    expect(localizeCity('Abu Dhabi',   'fr')).toBe('Abou Dabi');
    expect(localizeCity('Mexico City', 'de')).toBe('Mexiko-Stadt');
    expect(localizeCity('Mexico City', 'fr')).toBe('Mexico');
    expect(localizeCity('Santiago',    'de')).toBe('Santiago de Chile');
  });

  it('compound airport labels translate the city prefix only', () => {
    expect(localizeCity('London Heathrow',  'fr')).toBe('Londres Heathrow');
    expect(localizeCity('Rome Fiumicino',   'de')).toBe('Rom Fiumicino');
    expect(localizeCity('Athens Intl',      'de')).toBe('Athen Intl');
    expect(localizeCity('Cologne Bonn',     'de')).toBe('Köln Bonn');
    // No-op cases — the prefix exists but has no locale difference
    expect(localizeCity('Paris CDG',        'de')).toBe('Paris CDG');
    expect(localizeCity('New York JFK',     'de')).toBe('New York JFK');
  });

  it('does NOT use upstream slang / historical names', () => {
    // These are the upstream failure modes we explicitly override.
    expect(localizeCity('Istanbul',     'de')).not.toBe('Konstantinopel');
    expect(localizeCity('Paris',        'fr')).not.toBe('Pantruche');
    expect(localizeCity('Zurich',       'de')).toBe('Zürich');          // not "Zuerich"
    expect(localizeCity('Osaka',        'de')).toBe('Osaka');           // not "Ōsaka"
    expect(localizeCity('Johannesburg', 'fr')).toBe('Johannesbourg');   // not "Jo'anna"
    expect(localizeCity('Bratislava',   'de')).toBe('Bratislava');      // not "Preßburg"
    expect(localizeCity('Zagreb',       'de')).toBe('Zagreb');          // not "Agram"
    expect(localizeCity('Tallinn',      'de')).toBe('Tallinn');         // not "Reval"
    expect(localizeCity('Almaty',       'de')).toBe('Almaty');          // not "Werny"
    expect(localizeCity('Busan',        'fr')).toBe('Busan');           // not "Pusan"
  });

  it('covers additional Eastern European / Balkan / Caucasus cities', () => {
    expect(localizeCity('Krakow',       'de')).toBe('Krakau');
    expect(localizeCity('Krakow',       'fr')).toBe('Cracovie');
    expect(localizeCity('Wroclaw',      'de')).toBe('Breslau');
    expect(localizeCity('Gdansk',       'de')).toBe('Danzig');
    expect(localizeCity('Belgrade',     'de')).toBe('Belgrad');
    expect(localizeCity('Thessaloniki', 'fr')).toBe('Thessalonique');
    expect(localizeCity('Tbilisi',      'de')).toBe('Tiflis');
    expect(localizeCity('Yerevan',      'de')).toBe('Jerewan');
    expect(localizeCity('Baku',         'fr')).toBe('Bakou');
  });

  it('covers Iberian / Nordic secondary cities', () => {
    expect(localizeCity('Valencia',     'fr')).toBe('Valence');
    expect(localizeCity('Zaragoza',     'de')).toBe('Saragossa');
    expect(localizeCity('Zaragoza',     'fr')).toBe('Saragosse');
    expect(localizeCity('Gothenburg',   'de')).toBe('Göteborg');
    expect(localizeCity('Majorca',      'de')).toBe('Mallorca');
    expect(localizeCity('Majorca',      'fr')).toBe('Majorque');
  });

  it('covers additional Asian hubs', () => {
    expect(localizeCity('Nanjing',      'de')).toBe('Nanking');
    expect(localizeCity('Nanjing',      'fr')).toBe('Nankin');
    expect(localizeCity('Macau',        'de')).toBe('Macao');
    expect(localizeCity('Karachi',      'de')).toBe('Karatschi');
    expect(localizeCity('Dhaka',        'fr')).toBe('Dacca');
    expect(localizeCity('Yangon',       'de')).toBe('Rangun');
    expect(localizeCity('Tashkent',     'de')).toBe('Taschkent');
    expect(localizeCity('Tashkent',     'fr')).toBe('Tachkent');
    expect(localizeCity('Ulaanbaatar',  'fr')).toBe('Oulan-Bator');
    expect(localizeCity('Kathmandu',    'fr')).toBe('Katmandou');
  });

  it('covers Middle East / North Africa secondary cities', () => {
    expect(localizeCity('Beirut',       'fr')).toBe('Beyrouth');
    expect(localizeCity('Muscat',       'de')).toBe('Maskat');
    expect(localizeCity('Muscat',       'fr')).toBe('Mascate');
    expect(localizeCity('Kuwait City',  'de')).toBe('Kuwait-Stadt');
    expect(localizeCity('Kuwait City',  'fr')).toBe('Koweït');
    expect(localizeCity('Mecca',        'de')).toBe('Mekka');
    expect(localizeCity('Mecca',        'fr')).toBe('La Mecque');
    expect(localizeCity('Medina',       'fr')).toBe('Médine');
    expect(localizeCity('Isfahan',      'fr')).toBe('Ispahan');
    expect(localizeCity('Tripoli',      'de')).toBe('Tripolis');
  });

  it('covers more Sub-Saharan Africa', () => {
    expect(localizeCity('Khartoum',     'de')).toBe('Khartum');
    expect(localizeCity('Dar es Salaam','de')).toBe('Daressalam');
    expect(localizeCity('Addis Ababa',  'de')).toBe('Addis Abeba');
    expect(localizeCity('Addis Ababa',  'fr')).toBe('Addis-Abeba');
  });

  it('covers Latin America hubs', () => {
    expect(localizeCity('Havana',       'de')).toBe('Havanna');
    expect(localizeCity('Havana',       'fr')).toBe('La Havane');
    expect(localizeCity('Panama City',  'de')).toBe('Panama-Stadt');
    expect(localizeCity('Guatemala City','de')).toBe('Guatemala-Stadt');
    expect(localizeCity('Santo Domingo','fr')).toBe('Saint-Domingue');
  });

  it('covers US secondary hub names with French differences', () => {
    expect(localizeCity('New Orleans',  'fr')).toBe('La Nouvelle-Orléans');
    expect(localizeCity('Detroit',      'fr')).toBe('Détroit');
    expect(localizeCity('St. Louis',    'fr')).toBe('Saint-Louis');
  });

  it('falls back to the original name when no translation exists', () => {
    expect(localizeCity('Atlantis', 'de')).toBe('Atlantis');
    expect(localizeCity('Nowhere', 'fr')).toBe('Nowhere');
  });

  it('is tolerant of mixed casing and trailing whitespace', () => {
    // Forward-lookup is normalised by the implementation.
    expect(localizeCity('nice', 'de')).toBe('Nizza');
    expect(localizeCity(' Munich ', 'de')).toBe('München');
  });

  it('handles empty / nullish input without throwing', () => {
    expect(localizeCity('', 'de')).toBe('');
  });
});

describe('resolveCityAlias', () => {
  it('finds the canonical English name from a German query', () => {
    expect(resolveCityAlias('Nizza')).toBe('Nice');
    expect(resolveCityAlias('Köln')).toBe('Cologne');
    expect(resolveCityAlias('Wien')).toBe('Vienna');
    expect(resolveCityAlias('Tokio')).toBe('Tokyo');
  });

  it('finds the canonical English name from a French query', () => {
    expect(resolveCityAlias('Londres')).toBe('London');
    expect(resolveCityAlias('Genève')).toBe('Geneva');
    expect(resolveCityAlias('Vienne')).toBe('Vienna');
  });

  it('accepts the English name itself', () => {
    expect(resolveCityAlias('Nice')).toBe('Nice');
    expect(resolveCityAlias('Munich')).toBe('Munich');
  });

  it('is diacritics-insensitive', () => {
    // "Koln" without umlaut must resolve to Cologne.
    expect(resolveCityAlias('Koln')).toBe('Cologne');
    expect(resolveCityAlias('Munchen')).toBe('Munich');
  });

  it('returns null for unknown queries', () => {
    expect(resolveCityAlias('Atlantis')).toBeNull();
    expect(resolveCityAlias('')).toBeNull();
  });

  it('resolves the new curated Asian / Slavic / ME aliases', () => {
    expect(resolveCityAlias('Krakau')).toBe('Krakow');
    expect(resolveCityAlias('Breslau')).toBe('Wroclaw');
    expect(resolveCityAlias('Danzig')).toBe('Gdansk');
    expect(resolveCityAlias('Cracovie')).toBe('Krakow');
    expect(resolveCityAlias('Beyrouth')).toBe('Beirut');
    expect(resolveCityAlias('Mekka')).toBe('Mecca');
    expect(resolveCityAlias('La Mecque')).toBe('Mecca');
    expect(resolveCityAlias('Havanna')).toBe('Havana');
    expect(resolveCityAlias('La Havane')).toBe('Havana');
    expect(resolveCityAlias('Taschkent')).toBe('Tashkent');
    expect(resolveCityAlias('Nankin')).toBe('Nanjing');
    expect(resolveCityAlias('Khartum')).toBe('Khartoum');
    expect(resolveCityAlias('Göteborg')).toBe('Gothenburg');
  });
});

describe('cityNameMatches — the airport-search helper', () => {
  it('matches a German query against the English city name', () => {
    // User types "Nizza" while app is in German → find Nice airports
    expect(cityNameMatches('Nice', 'Nizza')).toBe(true);
    expect(cityNameMatches('Cologne', 'Köln')).toBe(true);
  });

  it('matches partial strings across all locales', () => {
    expect(cityNameMatches('Nice', 'niz')).toBe(true); // German prefix
    expect(cityNameMatches('Nice', 'nic')).toBe(true); // English prefix
    expect(cityNameMatches('London', 'londr')).toBe(true); // French prefix "Londres"
  });

  it('matches the English name too', () => {
    expect(cityNameMatches('Nice', 'Nice')).toBe(true);
    expect(cityNameMatches('Vienna', 'Vienna')).toBe(true);
  });

  it('rejects unrelated queries', () => {
    expect(cityNameMatches('Nice', 'Berlin')).toBe(false);
    expect(cityNameMatches('Cologne', 'Paris')).toBe(false);
  });

  it('ignores case and diacritics', () => {
    expect(cityNameMatches('Cologne', 'KÖLN')).toBe(true);
    expect(cityNameMatches('Cologne', 'koln')).toBe(true);
    expect(cityNameMatches('Geneva', 'geneve')).toBe(true); // "Genève" without accent
  });

  it('handles empty input gracefully', () => {
    expect(cityNameMatches('Nice', '')).toBe(false);
  });

  it('gracefully falls back to substring match when city is unknown', () => {
    // Still lets airport-search work on cities not in the i18n table.
    expect(cityNameMatches('SomeSmallTown', 'small')).toBe(true);
    expect(cityNameMatches('SomeSmallTown', 'xyz')).toBe(false);
  });
});
