/**
 * Localized city names for major airports.
 * Maps English city name -> { locale: localizedName }.
 */
export const CITY_TRANSLATIONS: Record<string, Record<string, string>> = {
  // German cities
  Munich: { de: 'M\u00FCnchen', fr: 'Munich' },
  Cologne: { de: 'K\u00F6ln', fr: 'Cologne' },
  Nuremberg: { de: 'N\u00FCrnberg', fr: 'Nuremberg' },
  Dusseldorf: { de: 'D\u00FCsseldorf', fr: 'D\u00FCsseldorf' },
  Hanover: { de: 'Hannover', fr: 'Hanovre' },
  Vienna: { de: 'Wien', fr: 'Vienne' },
  Zurich: { de: 'Z\u00FCrich', fr: 'Zurich' },
  'Z\u00FCrich': { de: 'Z\u00FCrich', fr: 'Zurich' },
  Geneva: { de: 'Genf', fr: 'Gen\u00E8ve' },
  Berne: { de: 'Bern', fr: 'Berne' },
  Brussels: { de: 'Br\u00FCssel', fr: 'Bruxelles' },
  Copenhagen: { de: 'Kopenhagen', fr: 'Copenhague' },
  Prague: { de: 'Prag', fr: 'Prague' },
  Warsaw: { de: 'Warschau', fr: 'Varsovie' },
  Budapest: { de: 'Budapest', fr: 'Budapest' },
  Bucharest: { de: 'Bukarest', fr: 'Bucarest' },
  Athens: { de: 'Athen', fr: 'Ath\u00E8nes' },
  Lisbon: { de: 'Lissabon', fr: 'Lisbonne' },
  Moscow: { de: 'Moskau', fr: 'Moscou' },

  // French cities
  Paris: { de: 'Paris', fr: 'Paris' },
  Nice: { de: 'Nizza', fr: 'Nice' },
  Marseille: { de: 'Marseille', fr: 'Marseille' },
  Lyon: { de: 'Lyon', fr: 'Lyon' },
  Strasbourg: { de: 'Stra\u00DFburg', fr: 'Strasbourg' },
  Bordeaux: { de: 'Bordeaux', fr: 'Bordeaux' },
  Toulouse: { de: 'Toulouse', fr: 'Toulouse' },

  // Italian cities
  Rome: { de: 'Rom', fr: 'Rome' },
  Milan: { de: 'Mailand', fr: 'Milan' },
  Venice: { de: 'Venedig', fr: 'Venise' },
  Florence: { de: 'Florenz', fr: 'Florence' },
  Naples: { de: 'Neapel', fr: 'Naples' },
  Genoa: { de: 'Genua', fr: 'G\u00EAnes' },
  Turin: { de: 'Turin', fr: 'Turin' },

  // Spanish cities
  Seville: { de: 'Sevilla', fr: 'S\u00E9ville' },
  Majorca: { de: 'Mallorca', fr: 'Majorque' },

  // UK / Americas
  London: { de: 'London', fr: 'Londres' },
  Edinburgh: { de: 'Edinburgh', fr: '\u00C9dimbourg' },
  'New York': { de: 'New York', fr: 'New York' },

  // Middle East / Africa
  Cairo: { de: 'Kairo', fr: 'Le Caire' },
  Algiers: { de: 'Algier', fr: 'Alger' },
  Tunis: { de: 'Tunis', fr: 'Tunis' },
  Casablanca: { de: 'Casablanca', fr: 'Casablanca' },
  Marrakech: { de: 'Marrakesch', fr: 'Marrakech' },
  Jeddah: { de: 'Dschidda', fr: 'Djeddah' },
  Riyadh: { de: 'Riad', fr: 'Riyad' },

  // Asia
  Beijing: { de: 'Peking', fr: 'P\u00E9kin' },
  Tokyo: { de: 'Tokio', fr: 'Tokyo' },
  Seoul: { de: 'Seoul', fr: 'S\u00E9oul' },
  Bangkok: { de: 'Bangkok', fr: 'Bangkok' },
  Delhi: { de: 'Delhi', fr: 'Delhi' },
  Singapore: { de: 'Singapur', fr: 'Singapour' },
};

/**
 * Returns the localized city name for the given locale.
 * Falls back to the original name if no translation exists.
 */
export function localizeCity(city: string, locale: string): string {
  if (locale === 'en') return city;
  const translations = CITY_TRANSLATIONS[city];
  if (!translations) return city;
  return translations[locale] ?? city;
}
