/**
 * Localized country names.
 * Maps English country name -> { locale: localizedName }.
 */
export const COUNTRY_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Europe
  Germany: { de: 'Deutschland', fr: 'Allemagne' },
  France: { de: 'Frankreich', fr: 'France' },
  Italy: { de: 'Italien', fr: 'Italie' },
  Spain: { de: 'Spanien', fr: 'Espagne' },
  Portugal: { de: 'Portugal', fr: 'Portugal' },
  UK: { de: 'Vereinigtes K\u00F6nigreich', fr: 'Royaume-Uni' },
  'United Kingdom': { de: 'Vereinigtes K\u00F6nigreich', fr: 'Royaume-Uni' },
  Netherlands: { de: 'Niederlande', fr: 'Pays-Bas' },
  Belgium: { de: 'Belgien', fr: 'Belgique' },
  Switzerland: { de: 'Schweiz', fr: 'Suisse' },
  Austria: { de: '\u00D6sterreich', fr: 'Autriche' },
  Poland: { de: 'Polen', fr: 'Pologne' },
  Czechia: { de: 'Tschechien', fr: 'Tch\u00E9quie' },
  'Czech Republic': { de: 'Tschechien', fr: 'Tch\u00E9quie' },
  Hungary: { de: 'Ungarn', fr: 'Hongrie' },
  Romania: { de: 'Rum\u00E4nien', fr: 'Roumanie' },
  Greece: { de: 'Griechenland', fr: 'Gr\u00E8ce' },
  Turkey: { de: 'T\u00FCrkei', fr: 'Turquie' },
  Denmark: { de: 'D\u00E4nemark', fr: 'Danemark' },
  Sweden: { de: 'Schweden', fr: 'Su\u00E8de' },
  Norway: { de: 'Norwegen', fr: 'Norv\u00E8ge' },
  Finland: { de: 'Finnland', fr: 'Finlande' },
  Iceland: { de: 'Island', fr: 'Islande' },
  Ireland: { de: 'Irland', fr: 'Irlande' },
  Croatia: { de: 'Kroatien', fr: 'Croatie' },
  Serbia: { de: 'Serbien', fr: 'Serbie' },
  Bulgaria: { de: 'Bulgarien', fr: 'Bulgarie' },
  Slovakia: { de: 'Slowakei', fr: 'Slovaquie' },
  Slovenia: { de: 'Slowenien', fr: 'Slov\u00E9nie' },
  Latvia: { de: 'Lettland', fr: 'Lettonie' },
  Lithuania: { de: 'Litauen', fr: 'Lituanie' },
  Estonia: { de: 'Estland', fr: 'Estonie' },
  Malta: { de: 'Malta', fr: 'Malte' },
  Luxembourg: { de: 'Luxemburg', fr: 'Luxembourg' },
  Cyprus: { de: 'Zypern', fr: 'Chypre' },
  Albania: { de: 'Albanien', fr: 'Albanie' },
  Montenegro: { de: 'Montenegro', fr: 'Mont\u00E9n\u00E9gro' },
  'North Macedonia': { de: 'Nordmazedonien', fr: 'Mac\u00E9doine du Nord' },
  'Bosnia and Herzegovina': { de: 'Bosnien und Herzegowina', fr: 'Bosnie-Herz\u00E9govine' },

  // Middle East / North Africa
  UAE: { de: 'Vereinigte Arabische Emirate', fr: '\u00C9mirats arabes unis' },
  'United Arab Emirates': { de: 'Vereinigte Arabische Emirate', fr: '\u00C9mirats arabes unis' },
  'Saudi Arabia': { de: 'Saudi-Arabien', fr: 'Arabie saoudite' },
  Qatar: { de: 'Katar', fr: 'Qatar' },
  Oman: { de: 'Oman', fr: 'Oman' },
  Kuwait: { de: 'Kuwait', fr: 'Kowe\u00EFt' },
  Bahrain: { de: 'Bahrain', fr: 'Bahre\u00EFn' },
  Jordan: { de: 'Jordanien', fr: 'Jordanie' },
  Lebanon: { de: 'Libanon', fr: 'Liban' },
  Iraq: { de: 'Irak', fr: 'Irak' },
  Iran: { de: 'Iran', fr: 'Iran' },
  Israel: { de: 'Israel', fr: 'Isra\u00EBl' },
  Egypt: { de: '\u00C4gypten', fr: '\u00C9gypte' },
  Morocco: { de: 'Marokko', fr: 'Maroc' },
  Tunisia: { de: 'Tunesien', fr: 'Tunisie' },
  Algeria: { de: 'Algerien', fr: 'Alg\u00E9rie' },
  Libya: { de: 'Libyen', fr: 'Libye' },

  // Sub-Saharan Africa
  'South Africa': { de: 'S\u00FCdafrika', fr: 'Afrique du Sud' },
  Nigeria: { de: 'Nigeria', fr: 'Nig\u00E9ria' },
  Kenya: { de: 'Kenia', fr: 'Kenya' },
  Ethiopia: { de: '\u00C4thiopien', fr: '\u00C9thiopie' },
  Tanzania: { de: 'Tansania', fr: 'Tanzanie' },
  Ghana: { de: 'Ghana', fr: 'Ghana' },
  Senegal: { de: 'Senegal', fr: 'S\u00E9n\u00E9gal' },
  'Ivory Coast': { de: 'Elfenbeink\u00FCste', fr: "C\u00F4te d'Ivoire" },
  Cameroon: { de: 'Kamerun', fr: 'Cameroun' },
  Rwanda: { de: 'Ruanda', fr: 'Rwanda' },
  Mauritius: { de: 'Mauritius', fr: 'Maurice' },
  Madagascar: { de: 'Madagaskar', fr: 'Madagascar' },
  Mozambique: { de: 'Mosambik', fr: 'Mozambique' },

  // Americas
  USA: { de: 'USA', fr: '\u00C9tats-Unis' },
  'United States': { de: 'Vereinigte Staaten', fr: '\u00C9tats-Unis' },
  Canada: { de: 'Kanada', fr: 'Canada' },
  Mexico: { de: 'Mexiko', fr: 'Mexique' },
  Brazil: { de: 'Brasilien', fr: 'Br\u00E9sil' },
  Argentina: { de: 'Argentinien', fr: 'Argentine' },
  Chile: { de: 'Chile', fr: 'Chili' },
  Colombia: { de: 'Kolumbien', fr: 'Colombie' },
  Peru: { de: 'Peru', fr: 'P\u00E9rou' },
  Cuba: { de: 'Kuba', fr: 'Cuba' },
  Panama: { de: 'Panama', fr: 'Panama' },
  'Costa Rica': { de: 'Costa Rica', fr: 'Costa Rica' },
  Ecuador: { de: 'Ecuador', fr: '\u00C9quateur' },

  // Asia-Pacific
  China: { de: 'China', fr: 'Chine' },
  Japan: { de: 'Japan', fr: 'Japon' },
  'South Korea': { de: 'S\u00FCdkorea', fr: 'Cor\u00E9e du Sud' },
  India: { de: 'Indien', fr: 'Inde' },
  Thailand: { de: 'Thailand', fr: 'Tha\u00EFlande' },
  Vietnam: { de: 'Vietnam', fr: 'Vi\u00EAt Nam' },
  Indonesia: { de: 'Indonesien', fr: 'Indon\u00E9sie' },
  Malaysia: { de: 'Malaysia', fr: 'Malaisie' },
  Philippines: { de: 'Philippinen', fr: 'Philippines' },
  Singapore: { de: 'Singapur', fr: 'Singapour' },
  Taiwan: { de: 'Taiwan', fr: 'Ta\u00EFwan' },
  'Hong Kong': { de: 'Hongkong', fr: 'Hong Kong' },
  Australia: { de: 'Australien', fr: 'Australie' },
  'New Zealand': { de: 'Neuseeland', fr: 'Nouvelle-Z\u00E9lande' },
  Pakistan: { de: 'Pakistan', fr: 'Pakistan' },
  Bangladesh: { de: 'Bangladesch', fr: 'Bangladesh' },
  'Sri Lanka': { de: 'Sri Lanka', fr: 'Sri Lanka' },
  Nepal: { de: 'Nepal', fr: 'N\u00E9pal' },
  Myanmar: { de: 'Myanmar', fr: 'Myanmar' },
  Cambodia: { de: 'Kambodscha', fr: 'Cambodge' },

  // Other
  Russia: { de: 'Russland', fr: 'Russie' },
  Ukraine: { de: 'Ukraine', fr: 'Ukraine' },
  Georgia: { de: 'Georgien', fr: 'G\u00E9orgie' },
  Azerbaijan: { de: 'Aserbaidschan', fr: 'Azerba\u00EFdjan' },
  Armenia: { de: 'Armenien', fr: 'Arm\u00E9nie' },
  Kazakhstan: { de: 'Kasachstan', fr: 'Kazakhstan' },
  Uzbekistan: { de: 'Usbekistan', fr: 'Ouzb\u00E9kistan' },
  Moldova: { de: 'Moldau', fr: 'Moldavie' },
};

/**
 * Returns the localized country name for the given locale.
 * Falls back to the original English name if no translation exists.
 */
export function localizeCountry(country: string, locale: string): string {
  if (locale === 'en') return country;
  const translations = COUNTRY_TRANSLATIONS[country];
  if (!translations) return country;
  return translations[locale] ?? country;
}

/** Map country name to 2-letter ISO code for flag lookup */
const NAME_TO_CODE: Record<string, string> = {
  Germany:'de',France:'fr',Italy:'it',Spain:'es',UK:'gb','United Kingdom':'gb',
  Netherlands:'nl',Belgium:'be',Switzerland:'ch',Austria:'at',Poland:'pl',
  Turkey:'tr',Greece:'gr',Portugal:'pt',Ireland:'ie',Denmark:'dk',Sweden:'se',
  Norway:'no',Finland:'fi',Iceland:'is',Croatia:'hr',Serbia:'rs',Romania:'ro',
  Hungary:'hu',Czechia:'cz','Czech Republic':'cz',Bulgaria:'bg',
  USA:'us','United States':'us',Canada:'ca',Mexico:'mx',Brazil:'br',
  Argentina:'ar',Chile:'cl',Colombia:'co',Peru:'pe',
  UAE:'ae','United Arab Emirates':'ae','Saudi Arabia':'sa',Qatar:'qa',
  Oman:'om',Kuwait:'kw',Bahrain:'bh',Jordan:'jo',Lebanon:'lb',
  Iraq:'iq',Iran:'ir',Israel:'il',Egypt:'eg',Morocco:'ma',
  Tunisia:'tn',Algeria:'dz',Libya:'ly','South Africa':'za',
  Nigeria:'ng',Kenya:'ke',Ethiopia:'et',Ghana:'gh',
  China:'cn',Japan:'jp','South Korea':'kr',India:'in',
  Thailand:'th',Vietnam:'vn',Indonesia:'id',Malaysia:'my',
  Philippines:'ph',Singapore:'sg',Taiwan:'tw','Hong Kong':'hk',
  Australia:'au','New Zealand':'nz',Russia:'ru',Ukraine:'ua',
  Malta:'mt',Luxembourg:'lu',Latvia:'lv',Lithuania:'lt',Estonia:'ee',
  Cyprus:'cy',Moldova:'md',Georgia:'ge',Azerbaijan:'az',
  Pakistan:'pk','Sri Lanka':'lk',Bangladesh:'bd',Nepal:'np',
  Cambodia:'kh',Myanmar:'mm',
};

export function countryToCode(country: string): string {
  if (!country) return '';
  if (country.length === 2) return country.toLowerCase();
  return NAME_TO_CODE[country] ?? '';
}

/** Inverse map: 2-letter ISO code → English country name */
const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_CODE).map(([name, code]) => [code, name])
);

/**
 * Convert a 2-letter ISO code to a full English country name.
 * Falls back to the uppercase code if not found.
 */
export function codeToCountryName(code: string): string {
  if (!code) return '';
  return CODE_TO_NAME[code.toLowerCase()] ?? code.toUpperCase();
}

