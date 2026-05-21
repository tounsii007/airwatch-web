import type { AppLanguage } from '@/lib/types';

/**
 * Multi-locale country index with bidirectional lookup.
 *
 * <h3>Two lookup directions</h3>
 * <ul>
 *   <li><b>Forward</b> ({@link localizeCountry}) — given the canonical English
 *       name (what {@code airports.json} and the AIRLINES catalogue store) plus
 *       the active locale, return the variant to show the user.
 *       "Tunisia" + "de" → "Tunesien".</li>
 *   <li><b>Reverse</b> ({@link resolveCountryAlias}, {@link countryNameMatches})
 *       — given a free-form query in any of the nine supported languages, work
 *       out which canonical English country it refers to. This is what powers
 *       "typing Tunesien finds Tunisair / Tunis airports / flights to TUN
 *       even when the app language is English / French / Arabic / …".</li>
 * </ul>
 *
 * <h3>Locale coverage</h3>
 * All nine app locales are first-class: en / de / fr / es / it / ar / pl / nl / tr.
 * Every entry must carry the English canonical form; other locales fall back
 * to English when no translation is supplied.
 *
 * <h3>Normalisation</h3>
 * The reverse index is keyed by an NFD-stripped, lower-cased version of every
 * known alias. That means "tunesien", "TUNESIEN", " Tunesien ", "Tünesien"
 * all resolve to the same canonical English name.
 *
 * <h3>Multi-name canonical merging</h3>
 * Some countries have several common English forms: {@code "USA"} and
 * {@code "United States"}, {@code "UK"} and {@code "United Kingdom"},
 * {@code "Czechia"} and {@code "Czech Republic"}. We list them as separate
 * canonical entries but they all point at the same ISO-2 code, so airline /
 * airport filtering keeps working regardless of which form upstream sends.
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface LocalizedCountry {
  en: string;
  de?: string;
  fr?: string;
  es?: string;
  it?: string;
  ar?: string;
  pl?: string;
  nl?: string;
  tr?: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

/**
 * Curated multi-locale country names covering every country in the airline
 * catalogue plus the major airport-source countries. Alphabetised by region
 * for maintainability.
 *
 * Keys are the canonical English form as stored in the AIRLINES catalogue's
 * {@code country} field and {@link codeToCountryName} output. Multiple keys
 * may map to the same {@link NAME_TO_CODE} entry — see UK / United Kingdom.
 */
const TRANSLATIONS: Record<string, LocalizedCountry> = {
  // ── Europe — Germanic / Alpine ────────────────────────────────────────────
  Germany:        { en: 'Germany',        de: 'Deutschland',           fr: 'Allemagne',           es: 'Alemania',           it: 'Germania',          ar: 'ألمانيا',                pl: 'Niemcy',               nl: 'Duitsland',          tr: 'Almanya' },
  Austria:        { en: 'Austria',        de: 'Österreich',            fr: 'Autriche',            es: 'Austria',            it: 'Austria',           ar: 'النمسا',                 pl: 'Austria',              nl: 'Oostenrijk',         tr: 'Avusturya' },
  Switzerland:    { en: 'Switzerland',    de: 'Schweiz',               fr: 'Suisse',              es: 'Suiza',              it: 'Svizzera',          ar: 'سويسرا',                  pl: 'Szwajcaria',           nl: 'Zwitserland',        tr: 'İsviçre' },
  Liechtenstein:  { en: 'Liechtenstein',  de: 'Liechtenstein',         fr: 'Liechtenstein',       es: 'Liechtenstein',      it: 'Liechtenstein',     ar: 'ليختنشتاين',              pl: 'Liechtenstein',        nl: 'Liechtenstein',      tr: 'Lihtenştayn' },

  // ── Europe — Romance ──────────────────────────────────────────────────────
  France:         { en: 'France',         de: 'Frankreich',            fr: 'France',              es: 'Francia',            it: 'Francia',           ar: 'فرنسا',                  pl: 'Francja',              nl: 'Frankrijk',          tr: 'Fransa' },
  Italy:          { en: 'Italy',          de: 'Italien',               fr: 'Italie',              es: 'Italia',             it: 'Italia',            ar: 'إيطاليا',                 pl: 'Włochy',               nl: 'Italië',             tr: 'İtalya' },
  Spain:          { en: 'Spain',          de: 'Spanien',               fr: 'Espagne',             es: 'España',             it: 'Spagna',            ar: 'إسبانيا',                 pl: 'Hiszpania',            nl: 'Spanje',             tr: 'İspanya' },
  Portugal:       { en: 'Portugal',       de: 'Portugal',              fr: 'Portugal',            es: 'Portugal',           it: 'Portogallo',        ar: 'البرتغال',                pl: 'Portugalia',           nl: 'Portugal',           tr: 'Portekiz' },
  Monaco:         { en: 'Monaco',         de: 'Monaco',                fr: 'Monaco',              es: 'Mónaco',             it: 'Monaco',            ar: 'موناكو',                  pl: 'Monako',               nl: 'Monaco',             tr: 'Monako' },
  Andorra:        { en: 'Andorra',        de: 'Andorra',               fr: 'Andorre',             es: 'Andorra',            it: 'Andorra',           ar: 'أندورا',                  pl: 'Andora',               nl: 'Andorra',            tr: 'Andora' },

  // ── Europe — Benelux ─────────────────────────────────────────────────────
  Netherlands:    { en: 'Netherlands',    de: 'Niederlande',           fr: 'Pays-Bas',            es: 'Países Bajos',       it: 'Paesi Bassi',       ar: 'هولندا',                 pl: 'Holandia',             nl: 'Nederland',          tr: 'Hollanda' },
  Belgium:        { en: 'Belgium',        de: 'Belgien',               fr: 'Belgique',            es: 'Bélgica',            it: 'Belgio',            ar: 'بلجيكا',                  pl: 'Belgia',               nl: 'België',             tr: 'Belçika' },
  Luxembourg:     { en: 'Luxembourg',     de: 'Luxemburg',             fr: 'Luxembourg',          es: 'Luxemburgo',         it: 'Lussemburgo',       ar: 'لوكسمبورغ',                pl: 'Luksemburg',           nl: 'Luxemburg',          tr: 'Lüksemburg' },

  // ── Europe — British Isles ───────────────────────────────────────────────
  UK:             { en: 'UK',             de: 'Vereinigtes Königreich',fr: 'Royaume-Uni',         es: 'Reino Unido',        it: 'Regno Unito',       ar: 'المملكة المتحدة',          pl: 'Wielka Brytania',      nl: 'Verenigd Koninkrijk',tr: 'Birleşik Krallık' },
  'United Kingdom': { en: 'United Kingdom', de: 'Vereinigtes Königreich', fr: 'Royaume-Uni',       es: 'Reino Unido',        it: 'Regno Unito',       ar: 'المملكة المتحدة',          pl: 'Wielka Brytania',      nl: 'Verenigd Koninkrijk',tr: 'Birleşik Krallık' },
  Ireland:        { en: 'Ireland',        de: 'Irland',                fr: 'Irlande',             es: 'Irlanda',            it: 'Irlanda',           ar: 'أيرلندا',                 pl: 'Irlandia',             nl: 'Ierland',            tr: 'İrlanda' },

  // ── Europe — Nordic & Baltic ─────────────────────────────────────────────
  Denmark:        { en: 'Denmark',        de: 'Dänemark',              fr: 'Danemark',            es: 'Dinamarca',          it: 'Danimarca',         ar: 'الدنمارك',                pl: 'Dania',                nl: 'Denemarken',         tr: 'Danimarka' },
  Sweden:         { en: 'Sweden',         de: 'Schweden',              fr: 'Suède',               es: 'Suecia',             it: 'Svezia',            ar: 'السويد',                  pl: 'Szwecja',              nl: 'Zweden',             tr: 'İsveç' },
  Norway:         { en: 'Norway',         de: 'Norwegen',              fr: 'Norvège',             es: 'Noruega',            it: 'Norvegia',          ar: 'النرويج',                 pl: 'Norwegia',             nl: 'Noorwegen',          tr: 'Norveç' },
  Finland:        { en: 'Finland',        de: 'Finnland',              fr: 'Finlande',            es: 'Finlandia',          it: 'Finlandia',         ar: 'فنلندا',                  pl: 'Finlandia',            nl: 'Finland',            tr: 'Finlandiya' },
  Iceland:        { en: 'Iceland',        de: 'Island',                fr: 'Islande',             es: 'Islandia',           it: 'Islanda',           ar: 'آيسلندا',                 pl: 'Islandia',             nl: 'IJsland',            tr: 'İzlanda' },
  Latvia:         { en: 'Latvia',         de: 'Lettland',              fr: 'Lettonie',            es: 'Letonia',            it: 'Lettonia',          ar: 'لاتفيا',                  pl: 'Łotwa',                nl: 'Letland',            tr: 'Letonya' },
  Lithuania:      { en: 'Lithuania',      de: 'Litauen',               fr: 'Lituanie',            es: 'Lituania',           it: 'Lituania',          ar: 'ليتوانيا',                pl: 'Litwa',                nl: 'Litouwen',           tr: 'Litvanya' },
  Estonia:        { en: 'Estonia',        de: 'Estland',               fr: 'Estonie',             es: 'Estonia',            it: 'Estonia',           ar: 'إستونيا',                 pl: 'Estonia',              nl: 'Estland',            tr: 'Estonya' },

  // ── Europe — Slavic / Central / Balkan ───────────────────────────────────
  Poland:         { en: 'Poland',         de: 'Polen',                 fr: 'Pologne',             es: 'Polonia',            it: 'Polonia',           ar: 'بولندا',                  pl: 'Polska',               nl: 'Polen',              tr: 'Polonya' },
  Czechia:        { en: 'Czechia',        de: 'Tschechien',            fr: 'Tchéquie',            es: 'Chequia',            it: 'Cechia',            ar: 'التشيك',                  pl: 'Czechy',               nl: 'Tsjechië',           tr: 'Çekya' },
  'Czech Republic': { en: 'Czech Republic', de: 'Tschechien',          fr: 'République tchèque',  es: 'República Checa',    it: 'Repubblica Ceca',   ar: 'جمهورية التشيك',           pl: 'Republika Czeska',     nl: 'Tsjechië',           tr: 'Çek Cumhuriyeti' },
  Slovakia:       { en: 'Slovakia',       de: 'Slowakei',              fr: 'Slovaquie',           es: 'Eslovaquia',         it: 'Slovacchia',        ar: 'سلوفاكيا',                pl: 'Słowacja',             nl: 'Slowakije',          tr: 'Slovakya' },
  Hungary:        { en: 'Hungary',        de: 'Ungarn',                fr: 'Hongrie',             es: 'Hungría',            it: 'Ungheria',          ar: 'المجر',                   pl: 'Węgry',                nl: 'Hongarije',          tr: 'Macaristan' },
  Romania:        { en: 'Romania',        de: 'Rumänien',              fr: 'Roumanie',            es: 'Rumanía',            it: 'Romania',           ar: 'رومانيا',                 pl: 'Rumunia',              nl: 'Roemenië',           tr: 'Romanya' },
  Bulgaria:       { en: 'Bulgaria',       de: 'Bulgarien',             fr: 'Bulgarie',            es: 'Bulgaria',           it: 'Bulgaria',          ar: 'بلغاريا',                 pl: 'Bułgaria',             nl: 'Bulgarije',          tr: 'Bulgaristan' },
  Slovenia:       { en: 'Slovenia',       de: 'Slowenien',             fr: 'Slovénie',            es: 'Eslovenia',          it: 'Slovenia',          ar: 'سلوفينيا',                pl: 'Słowenia',             nl: 'Slovenië',           tr: 'Slovenya' },
  Croatia:        { en: 'Croatia',        de: 'Kroatien',              fr: 'Croatie',             es: 'Croacia',            it: 'Croazia',           ar: 'كرواتيا',                 pl: 'Chorwacja',            nl: 'Kroatië',            tr: 'Hırvatistan' },
  Serbia:         { en: 'Serbia',         de: 'Serbien',               fr: 'Serbie',              es: 'Serbia',             it: 'Serbia',            ar: 'صربيا',                   pl: 'Serbia',               nl: 'Servië',             tr: 'Sırbistan' },
  Montenegro:     { en: 'Montenegro',     de: 'Montenegro',            fr: 'Monténégro',          es: 'Montenegro',         it: 'Montenegro',        ar: 'الجبل الأسود',             pl: 'Czarnogóra',           nl: 'Montenegro',         tr: 'Karadağ' },
  'North Macedonia': { en: 'North Macedonia', de: 'Nordmazedonien',    fr: 'Macédoine du Nord',   es: 'Macedonia del Norte',it: 'Macedonia del Nord',ar: 'مقدونيا الشمالية',          pl: 'Macedonia Północna',   nl: 'Noord-Macedonië',    tr: 'Kuzey Makedonya' },
  'Bosnia and Herzegovina': { en: 'Bosnia and Herzegovina', de: 'Bosnien und Herzegowina', fr: 'Bosnie-Herzégovine', es: 'Bosnia y Herzegovina', it: 'Bosnia ed Erzegovina', ar: 'البوسنة والهرسك', pl: 'Bośnia i Hercegowina', nl: 'Bosnië en Herzegovina', tr: 'Bosna-Hersek' },
  Albania:        { en: 'Albania',        de: 'Albanien',              fr: 'Albanie',             es: 'Albania',            it: 'Albania',           ar: 'ألبانيا',                 pl: 'Albania',              nl: 'Albanië',            tr: 'Arnavutluk' },
  Kosovo:         { en: 'Kosovo',         de: 'Kosovo',                fr: 'Kosovo',              es: 'Kosovo',             it: 'Kosovo',            ar: 'كوسوفو',                  pl: 'Kosowo',               nl: 'Kosovo',             tr: 'Kosova' },

  // ── Europe — Mediterranean / Islands ─────────────────────────────────────
  Greece:         { en: 'Greece',         de: 'Griechenland',          fr: 'Grèce',               es: 'Grecia',             it: 'Grecia',            ar: 'اليونان',                 pl: 'Grecja',               nl: 'Griekenland',        tr: 'Yunanistan' },
  Cyprus:         { en: 'Cyprus',         de: 'Zypern',                fr: 'Chypre',              es: 'Chipre',             it: 'Cipro',             ar: 'قبرص',                    pl: 'Cypr',                 nl: 'Cyprus',             tr: 'Kıbrıs' },
  Malta:          { en: 'Malta',          de: 'Malta',                 fr: 'Malte',               es: 'Malta',              it: 'Malta',             ar: 'مالطا',                   pl: 'Malta',                nl: 'Malta',              tr: 'Malta' },
  Turkey:         { en: 'Turkey',         de: 'Türkei',                fr: 'Turquie',             es: 'Turquía',            it: 'Turchia',           ar: 'تركيا',                   pl: 'Turcja',               nl: 'Turkije',            tr: 'Türkiye' },

  // ── Europe / CIS ─────────────────────────────────────────────────────────
  Russia:         { en: 'Russia',         de: 'Russland',              fr: 'Russie',              es: 'Rusia',              it: 'Russia',            ar: 'روسيا',                   pl: 'Rosja',                nl: 'Rusland',            tr: 'Rusya' },
  Ukraine:        { en: 'Ukraine',        de: 'Ukraine',               fr: 'Ukraine',             es: 'Ucrania',            it: 'Ucraina',           ar: 'أوكرانيا',                pl: 'Ukraina',              nl: 'Oekraïne',           tr: 'Ukrayna' },
  Belarus:        { en: 'Belarus',        de: 'Belarus',               fr: 'Biélorussie',         es: 'Bielorrusia',        it: 'Bielorussia',       ar: 'بيلاروسيا',                pl: 'Białoruś',             nl: 'Belarus',            tr: 'Belarus' },
  Moldova:        { en: 'Moldova',        de: 'Moldau',                fr: 'Moldavie',            es: 'Moldavia',           it: 'Moldavia',          ar: 'مولدوفا',                 pl: 'Mołdawia',             nl: 'Moldavië',           tr: 'Moldova' },

  // ── Caucasus / Central Asia ──────────────────────────────────────────────
  Georgia:        { en: 'Georgia',        de: 'Georgien',              fr: 'Géorgie',             es: 'Georgia',            it: 'Georgia',           ar: 'جورجيا',                  pl: 'Gruzja',               nl: 'Georgië',            tr: 'Gürcistan' },
  Armenia:        { en: 'Armenia',        de: 'Armenien',              fr: 'Arménie',             es: 'Armenia',            it: 'Armenia',           ar: 'أرمينيا',                 pl: 'Armenia',              nl: 'Armenië',            tr: 'Ermenistan' },
  Azerbaijan:     { en: 'Azerbaijan',     de: 'Aserbaidschan',         fr: 'Azerbaïdjan',         es: 'Azerbaiyán',         it: 'Azerbaigian',       ar: 'أذربيجان',                pl: 'Azerbejdżan',          nl: 'Azerbeidzjan',       tr: 'Azerbaycan' },
  Kazakhstan:     { en: 'Kazakhstan',     de: 'Kasachstan',            fr: 'Kazakhstan',          es: 'Kazajistán',         it: 'Kazakistan',        ar: 'كازاخستان',                pl: 'Kazachstan',           nl: 'Kazachstan',         tr: 'Kazakistan' },
  Uzbekistan:     { en: 'Uzbekistan',     de: 'Usbekistan',            fr: 'Ouzbékistan',         es: 'Uzbekistán',         it: 'Uzbekistan',        ar: 'أوزبكستان',                pl: 'Uzbekistan',           nl: 'Oezbekistan',        tr: 'Özbekistan' },
  Turkmenistan:   { en: 'Turkmenistan',   de: 'Turkmenistan',          fr: 'Turkménistan',        es: 'Turkmenistán',       it: 'Turkmenistan',      ar: 'تركمانستان',               pl: 'Turkmenistan',         nl: 'Turkmenistan',       tr: 'Türkmenistan' },
  Kyrgyzstan:     { en: 'Kyrgyzstan',     de: 'Kirgisistan',           fr: 'Kirghizistan',        es: 'Kirguistán',         it: 'Kirghizistan',      ar: 'قيرغيزستان',               pl: 'Kirgistan',            nl: 'Kirgizië',           tr: 'Kırgızistan' },
  Tajikistan:     { en: 'Tajikistan',     de: 'Tadschikistan',         fr: 'Tadjikistan',         es: 'Tayikistán',         it: 'Tagikistan',        ar: 'طاجيكستان',                pl: 'Tadżykistan',          nl: 'Tadzjikistan',       tr: 'Tacikistan' },
  Mongolia:       { en: 'Mongolia',       de: 'Mongolei',              fr: 'Mongolie',            es: 'Mongolia',           it: 'Mongolia',          ar: 'منغوليا',                 pl: 'Mongolia',             nl: 'Mongolië',           tr: 'Moğolistan' },
  Afghanistan:    { en: 'Afghanistan',    de: 'Afghanistan',           fr: 'Afghanistan',         es: 'Afganistán',         it: 'Afghanistan',       ar: 'أفغانستان',                pl: 'Afganistan',           nl: 'Afghanistan',        tr: 'Afganistan' },

  // ── Middle East ──────────────────────────────────────────────────────────
  UAE:                  { en: 'UAE',                  de: 'Vereinigte Arabische Emirate', fr: 'Émirats arabes unis', es: 'Emiratos Árabes Unidos', it: 'Emirati Arabi Uniti', ar: 'الإمارات العربية المتحدة', pl: 'Zjednoczone Emiraty Arabskie', nl: 'Verenigde Arabische Emiraten', tr: 'Birleşik Arap Emirlikleri' },
  'United Arab Emirates': { en: 'United Arab Emirates', de: 'Vereinigte Arabische Emirate', fr: 'Émirats arabes unis', es: 'Emiratos Árabes Unidos', it: 'Emirati Arabi Uniti', ar: 'الإمارات العربية المتحدة', pl: 'Zjednoczone Emiraty Arabskie', nl: 'Verenigde Arabische Emiraten', tr: 'Birleşik Arap Emirlikleri' },
  'Saudi Arabia': { en: 'Saudi Arabia',   de: 'Saudi-Arabien',         fr: 'Arabie saoudite',     es: 'Arabia Saudí',       it: 'Arabia Saudita',    ar: 'المملكة العربية السعودية',   pl: 'Arabia Saudyjska',     nl: 'Saoedi-Arabië',      tr: 'Suudi Arabistan' },
  Qatar:          { en: 'Qatar',          de: 'Katar',                 fr: 'Qatar',               es: 'Catar',              it: 'Qatar',             ar: 'قطر',                     pl: 'Katar',                nl: 'Qatar',              tr: 'Katar' },
  Oman:           { en: 'Oman',           de: 'Oman',                  fr: 'Oman',                es: 'Omán',               it: 'Oman',              ar: 'عُمان',                    pl: 'Oman',                 nl: 'Oman',               tr: 'Umman' },
  Kuwait:         { en: 'Kuwait',         de: 'Kuwait',                fr: 'Koweït',              es: 'Kuwait',             it: 'Kuwait',            ar: 'الكويت',                  pl: 'Kuwejt',               nl: 'Koeweit',            tr: 'Kuveyt' },
  Bahrain:        { en: 'Bahrain',        de: 'Bahrain',               fr: 'Bahreïn',             es: 'Baréin',             it: 'Bahrein',           ar: 'البحرين',                 pl: 'Bahrajn',              nl: 'Bahrein',            tr: 'Bahreyn' },
  Yemen:          { en: 'Yemen',          de: 'Jemen',                 fr: 'Yémen',               es: 'Yemen',              it: 'Yemen',             ar: 'اليمن',                   pl: 'Jemen',                nl: 'Jemen',              tr: 'Yemen' },
  Iraq:           { en: 'Iraq',           de: 'Irak',                  fr: 'Irak',                es: 'Iraq',               it: 'Iraq',              ar: 'العراق',                  pl: 'Irak',                 nl: 'Irak',               tr: 'Irak' },
  Iran:           { en: 'Iran',           de: 'Iran',                  fr: 'Iran',                es: 'Irán',               it: 'Iran',              ar: 'إيران',                   pl: 'Iran',                 nl: 'Iran',               tr: 'İran' },
  Israel:         { en: 'Israel',         de: 'Israel',                fr: 'Israël',              es: 'Israel',             it: 'Israele',           ar: 'إسرائيل',                 pl: 'Izrael',               nl: 'Israël',             tr: 'İsrail' },
  Palestine:      { en: 'Palestine',      de: 'Palästina',             fr: 'Palestine',           es: 'Palestina',          it: 'Palestina',         ar: 'فلسطين',                  pl: 'Palestyna',            nl: 'Palestina',          tr: 'Filistin' },
  Jordan:         { en: 'Jordan',         de: 'Jordanien',             fr: 'Jordanie',            es: 'Jordania',           it: 'Giordania',         ar: 'الأردن',                  pl: 'Jordania',             nl: 'Jordanië',           tr: 'Ürdün' },
  Lebanon:        { en: 'Lebanon',        de: 'Libanon',               fr: 'Liban',               es: 'Líbano',             it: 'Libano',            ar: 'لبنان',                   pl: 'Liban',                nl: 'Libanon',            tr: 'Lübnan' },
  Syria:          { en: 'Syria',          de: 'Syrien',                fr: 'Syrie',               es: 'Siria',              it: 'Siria',             ar: 'سوريا',                   pl: 'Syria',                nl: 'Syrië',              tr: 'Suriye' },

  // ── North Africa ─────────────────────────────────────────────────────────
  Egypt:          { en: 'Egypt',          de: 'Ägypten',               fr: 'Égypte',              es: 'Egipto',             it: 'Egitto',            ar: 'مصر',                     pl: 'Egipt',                nl: 'Egypte',             tr: 'Mısır' },
  Libya:          { en: 'Libya',          de: 'Libyen',                fr: 'Libye',               es: 'Libia',              it: 'Libia',             ar: 'ليبيا',                   pl: 'Libia',                nl: 'Libië',              tr: 'Libya' },
  Tunisia:        { en: 'Tunisia',        de: 'Tunesien',              fr: 'Tunisie',             es: 'Túnez',              it: 'Tunisia',           ar: 'تونس',                    pl: 'Tunezja',              nl: 'Tunesië',            tr: 'Tunus' },
  Algeria:        { en: 'Algeria',        de: 'Algerien',              fr: 'Algérie',             es: 'Argelia',            it: 'Algeria',           ar: 'الجزائر',                 pl: 'Algieria',             nl: 'Algerije',           tr: 'Cezayir' },
  Morocco:        { en: 'Morocco',        de: 'Marokko',               fr: 'Maroc',               es: 'Marruecos',          it: 'Marocco',           ar: 'المغرب',                  pl: 'Maroko',               nl: 'Marokko',            tr: 'Fas' },
  Sudan:          { en: 'Sudan',          de: 'Sudan',                 fr: 'Soudan',              es: 'Sudán',              it: 'Sudan',             ar: 'السودان',                 pl: 'Sudan',                nl: 'Soedan',             tr: 'Sudan' },

  // ── Sub-Saharan Africa ───────────────────────────────────────────────────
  'South Africa': { en: 'South Africa',   de: 'Südafrika',             fr: 'Afrique du Sud',      es: 'Sudáfrica',          it: 'Sudafrica',         ar: 'جنوب أفريقيا',             pl: 'Republika Południowej Afryki', nl: 'Zuid-Afrika', tr: 'Güney Afrika' },
  Nigeria:        { en: 'Nigeria',        de: 'Nigeria',               fr: 'Nigéria',             es: 'Nigeria',            it: 'Nigeria',           ar: 'نيجيريا',                 pl: 'Nigeria',              nl: 'Nigeria',            tr: 'Nijerya' },
  Kenya:          { en: 'Kenya',          de: 'Kenia',                 fr: 'Kenya',               es: 'Kenia',              it: 'Kenya',             ar: 'كينيا',                   pl: 'Kenia',                nl: 'Kenia',              tr: 'Kenya' },
  Ethiopia:       { en: 'Ethiopia',       de: 'Äthiopien',             fr: 'Éthiopie',            es: 'Etiopía',            it: 'Etiopia',           ar: 'إثيوبيا',                  pl: 'Etiopia',              nl: 'Ethiopië',           tr: 'Etiyopya' },
  Tanzania:       { en: 'Tanzania',       de: 'Tansania',              fr: 'Tanzanie',            es: 'Tanzania',           it: 'Tanzania',          ar: 'تنزانيا',                 pl: 'Tanzania',             nl: 'Tanzania',           tr: 'Tanzanya' },
  Ghana:          { en: 'Ghana',          de: 'Ghana',                 fr: 'Ghana',               es: 'Ghana',              it: 'Ghana',             ar: 'غانا',                    pl: 'Ghana',                nl: 'Ghana',              tr: 'Gana' },
  Senegal:        { en: 'Senegal',        de: 'Senegal',               fr: 'Sénégal',             es: 'Senegal',            it: 'Senegal',           ar: 'السنغال',                 pl: 'Senegal',              nl: 'Senegal',            tr: 'Senegal' },
  'Ivory Coast':  { en: 'Ivory Coast',    de: 'Elfenbeinküste',        fr: "Côte d'Ivoire",       es: 'Costa de Marfil',    it: "Costa d'Avorio",    ar: 'ساحل العاج',                pl: 'Wybrzeże Kości Słoniowej', nl: 'Ivoorkust', tr: 'Fildişi Sahili' },
  Cameroon:       { en: 'Cameroon',       de: 'Kamerun',               fr: 'Cameroun',            es: 'Camerún',            it: 'Camerun',           ar: 'الكاميرون',                pl: 'Kamerun',              nl: 'Kameroen',           tr: 'Kamerun' },
  Rwanda:         { en: 'Rwanda',         de: 'Ruanda',                fr: 'Rwanda',              es: 'Ruanda',             it: 'Ruanda',            ar: 'رواندا',                  pl: 'Rwanda',               nl: 'Rwanda',             tr: 'Ruanda' },
  Uganda:         { en: 'Uganda',         de: 'Uganda',                fr: 'Ouganda',             es: 'Uganda',             it: 'Uganda',            ar: 'أوغندا',                  pl: 'Uganda',               nl: 'Oeganda',            tr: 'Uganda' },
  Angola:         { en: 'Angola',         de: 'Angola',                fr: 'Angola',              es: 'Angola',             it: 'Angola',            ar: 'أنغولا',                  pl: 'Angola',               nl: 'Angola',             tr: 'Angola' },
  Mozambique:     { en: 'Mozambique',     de: 'Mosambik',              fr: 'Mozambique',          es: 'Mozambique',         it: 'Mozambico',         ar: 'موزمبيق',                 pl: 'Mozambik',             nl: 'Mozambique',         tr: 'Mozambik' },
  Zimbabwe:       { en: 'Zimbabwe',       de: 'Simbabwe',              fr: 'Zimbabwe',            es: 'Zimbabue',           it: 'Zimbabwe',          ar: 'زيمبابوي',                 pl: 'Zimbabwe',             nl: 'Zimbabwe',           tr: 'Zimbabve' },
  Madagascar:     { en: 'Madagascar',     de: 'Madagaskar',            fr: 'Madagascar',          es: 'Madagascar',         it: 'Madagascar',        ar: 'مدغشقر',                  pl: 'Madagaskar',           nl: 'Madagaskar',         tr: 'Madagaskar' },
  Mauritius:      { en: 'Mauritius',      de: 'Mauritius',             fr: 'Maurice',             es: 'Mauricio',           it: 'Mauritius',         ar: 'موريشيوس',                pl: 'Mauritius',            nl: 'Mauritius',          tr: 'Mauritius' },
  Seychelles:     { en: 'Seychelles',     de: 'Seychellen',            fr: 'Seychelles',          es: 'Seychelles',         it: 'Seychelles',        ar: 'سيشل',                    pl: 'Seszele',              nl: 'Seychellen',         tr: 'Seyşeller' },

  // ── North America ────────────────────────────────────────────────────────
  USA:            { en: 'USA',            de: 'USA',                   fr: 'États-Unis',          es: 'EE. UU.',            it: 'USA',               ar: 'الولايات المتحدة',          pl: 'USA',                  nl: 'VS',                 tr: 'ABD' },
  'United States': { en: 'United States', de: 'Vereinigte Staaten',    fr: 'États-Unis',          es: 'Estados Unidos',     it: 'Stati Uniti',       ar: 'الولايات المتحدة',          pl: 'Stany Zjednoczone',    nl: 'Verenigde Staten',   tr: 'Amerika Birleşik Devletleri' },
  Canada:         { en: 'Canada',         de: 'Kanada',                fr: 'Canada',              es: 'Canadá',             it: 'Canada',            ar: 'كندا',                    pl: 'Kanada',               nl: 'Canada',             tr: 'Kanada' },
  Mexico:         { en: 'Mexico',         de: 'Mexiko',                fr: 'Mexique',             es: 'México',             it: 'Messico',           ar: 'المكسيك',                  pl: 'Meksyk',               nl: 'Mexico',             tr: 'Meksika' },

  // ── Latin America ────────────────────────────────────────────────────────
  Brazil:         { en: 'Brazil',         de: 'Brasilien',             fr: 'Brésil',              es: 'Brasil',             it: 'Brasile',           ar: 'البرازيل',                pl: 'Brazylia',             nl: 'Brazilië',           tr: 'Brezilya' },
  Argentina:      { en: 'Argentina',      de: 'Argentinien',           fr: 'Argentine',           es: 'Argentina',          it: 'Argentina',         ar: 'الأرجنتين',                pl: 'Argentyna',            nl: 'Argentinië',         tr: 'Arjantin' },
  Chile:          { en: 'Chile',          de: 'Chile',                 fr: 'Chili',               es: 'Chile',              it: 'Cile',              ar: 'تشيلي',                   pl: 'Chile',                nl: 'Chili',              tr: 'Şili' },
  Colombia:       { en: 'Colombia',       de: 'Kolumbien',             fr: 'Colombie',            es: 'Colombia',           it: 'Colombia',          ar: 'كولومبيا',                pl: 'Kolumbia',             nl: 'Colombia',           tr: 'Kolombiya' },
  Peru:           { en: 'Peru',           de: 'Peru',                  fr: 'Pérou',               es: 'Perú',               it: 'Perù',              ar: 'بيرو',                    pl: 'Peru',                 nl: 'Peru',               tr: 'Peru' },
  Venezuela:      { en: 'Venezuela',      de: 'Venezuela',             fr: 'Venezuela',           es: 'Venezuela',          it: 'Venezuela',         ar: 'فنزويلا',                 pl: 'Wenezuela',            nl: 'Venezuela',          tr: 'Venezuela' },
  Ecuador:        { en: 'Ecuador',        de: 'Ecuador',               fr: 'Équateur',            es: 'Ecuador',            it: 'Ecuador',           ar: 'الإكوادور',                pl: 'Ekwador',              nl: 'Ecuador',            tr: 'Ekvador' },
  Bolivia:        { en: 'Bolivia',        de: 'Bolivien',              fr: 'Bolivie',             es: 'Bolivia',            it: 'Bolivia',           ar: 'بوليفيا',                 pl: 'Boliwia',              nl: 'Bolivia',            tr: 'Bolivya' },
  Uruguay:        { en: 'Uruguay',        de: 'Uruguay',               fr: 'Uruguay',             es: 'Uruguay',            it: 'Uruguay',           ar: 'أوروغواي',                pl: 'Urugwaj',              nl: 'Uruguay',            tr: 'Uruguay' },
  Paraguay:       { en: 'Paraguay',       de: 'Paraguay',              fr: 'Paraguay',            es: 'Paraguay',           it: 'Paraguay',          ar: 'باراغواي',                pl: 'Paragwaj',             nl: 'Paraguay',           tr: 'Paraguay' },
  Cuba:           { en: 'Cuba',           de: 'Kuba',                  fr: 'Cuba',                es: 'Cuba',               it: 'Cuba',              ar: 'كوبا',                    pl: 'Kuba',                 nl: 'Cuba',               tr: 'Küba' },
  Panama:         { en: 'Panama',         de: 'Panama',                fr: 'Panama',              es: 'Panamá',             it: 'Panama',            ar: 'بنما',                    pl: 'Panama',               nl: 'Panama',             tr: 'Panama' },
  'Costa Rica':   { en: 'Costa Rica',     de: 'Costa Rica',            fr: 'Costa Rica',          es: 'Costa Rica',         it: 'Costa Rica',        ar: 'كوستاريكا',                pl: 'Kostaryka',            nl: 'Costa Rica',         tr: 'Kosta Rika' },
  'Dominican Republic': { en: 'Dominican Republic', de: 'Dominikanische Republik', fr: 'République dominicaine', es: 'República Dominicana', it: 'Repubblica Dominicana', ar: 'جمهورية الدومينيكان', pl: 'Dominikana', nl: 'Dominicaanse Republiek', tr: 'Dominik Cumhuriyeti' },
  Jamaica:        { en: 'Jamaica',        de: 'Jamaika',               fr: 'Jamaïque',            es: 'Jamaica',            it: 'Giamaica',          ar: 'جامايكا',                 pl: 'Jamajka',              nl: 'Jamaica',            tr: 'Jamaika' },
  Guadeloupe:     { en: 'Guadeloupe',     de: 'Guadeloupe',            fr: 'Guadeloupe',          es: 'Guadalupe',          it: 'Guadalupa',         ar: 'غوادلوب',                 pl: 'Gwadelupa',            nl: 'Guadeloupe',         tr: 'Guadeloupe' },

  // ── East Asia ────────────────────────────────────────────────────────────
  China:          { en: 'China',          de: 'China',                 fr: 'Chine',               es: 'China',              it: 'Cina',              ar: 'الصين',                    pl: 'Chiny',                nl: 'China',              tr: 'Çin' },
  Japan:          { en: 'Japan',          de: 'Japan',                 fr: 'Japon',               es: 'Japón',              it: 'Giappone',          ar: 'اليابان',                 pl: 'Japonia',              nl: 'Japan',              tr: 'Japonya' },
  'South Korea':  { en: 'South Korea',    de: 'Südkorea',              fr: 'Corée du Sud',        es: 'Corea del Sur',      it: 'Corea del Sud',     ar: 'كوريا الجنوبية',           pl: 'Korea Południowa',     nl: 'Zuid-Korea',         tr: 'Güney Kore' },
  'North Korea':  { en: 'North Korea',    de: 'Nordkorea',             fr: 'Corée du Nord',       es: 'Corea del Norte',    it: 'Corea del Nord',    ar: 'كوريا الشمالية',           pl: 'Korea Północna',       nl: 'Noord-Korea',        tr: 'Kuzey Kore' },
  Taiwan:         { en: 'Taiwan',         de: 'Taiwan',                fr: 'Taïwan',              es: 'Taiwán',             it: 'Taiwan',            ar: 'تايوان',                   pl: 'Tajwan',               nl: 'Taiwan',             tr: 'Tayvan' },
  'Hong Kong':    { en: 'Hong Kong',      de: 'Hongkong',              fr: 'Hong Kong',           es: 'Hong Kong',          it: 'Hong Kong',         ar: 'هونغ كونغ',                pl: 'Hongkong',             nl: 'Hongkong',           tr: 'Hong Kong' },
  Macau:          { en: 'Macau',          de: 'Macao',                 fr: 'Macao',               es: 'Macao',              it: 'Macao',             ar: 'ماكاو',                    pl: 'Makau',                nl: 'Macau',              tr: 'Makao' },

  // ── South Asia ───────────────────────────────────────────────────────────
  India:          { en: 'India',          de: 'Indien',                fr: 'Inde',                es: 'India',              it: 'India',             ar: 'الهند',                   pl: 'Indie',                nl: 'India',              tr: 'Hindistan' },
  Pakistan:       { en: 'Pakistan',       de: 'Pakistan',              fr: 'Pakistan',            es: 'Pakistán',           it: 'Pakistan',          ar: 'باكستان',                 pl: 'Pakistan',             nl: 'Pakistan',           tr: 'Pakistan' },
  Bangladesh:     { en: 'Bangladesh',     de: 'Bangladesch',           fr: 'Bangladesh',          es: 'Bangladés',          it: 'Bangladesh',        ar: 'بنغلاديش',                pl: 'Bangladesz',           nl: 'Bangladesh',         tr: 'Bangladeş' },
  'Sri Lanka':    { en: 'Sri Lanka',      de: 'Sri Lanka',             fr: 'Sri Lanka',           es: 'Sri Lanka',          it: 'Sri Lanka',         ar: 'سريلانكا',                 pl: 'Sri Lanka',            nl: 'Sri Lanka',          tr: 'Sri Lanka' },
  Nepal:          { en: 'Nepal',          de: 'Nepal',                 fr: 'Népal',               es: 'Nepal',              it: 'Nepal',             ar: 'نيبال',                   pl: 'Nepal',                nl: 'Nepal',              tr: 'Nepal' },
  Bhutan:         { en: 'Bhutan',         de: 'Bhutan',                fr: 'Bhoutan',             es: 'Bután',              it: 'Bhutan',            ar: 'بوتان',                   pl: 'Bhutan',               nl: 'Bhutan',             tr: 'Butan' },
  Maldives:       { en: 'Maldives',       de: 'Malediven',             fr: 'Maldives',            es: 'Maldivas',           it: 'Maldive',           ar: 'المالديف',                pl: 'Malediwy',             nl: 'Maldiven',           tr: 'Maldivler' },

  // ── South-East Asia ──────────────────────────────────────────────────────
  Thailand:       { en: 'Thailand',       de: 'Thailand',              fr: 'Thaïlande',           es: 'Tailandia',          it: 'Thailandia',        ar: 'تايلاند',                 pl: 'Tajlandia',            nl: 'Thailand',           tr: 'Tayland' },
  Vietnam:        { en: 'Vietnam',        de: 'Vietnam',               fr: 'Viêt Nam',            es: 'Vietnam',            it: 'Vietnam',           ar: 'فيتنام',                  pl: 'Wietnam',              nl: 'Vietnam',            tr: 'Vietnam' },
  Cambodia:       { en: 'Cambodia',       de: 'Kambodscha',            fr: 'Cambodge',            es: 'Camboya',            it: 'Cambogia',          ar: 'كمبوديا',                 pl: 'Kambodża',             nl: 'Cambodja',           tr: 'Kamboçya' },
  Laos:           { en: 'Laos',           de: 'Laos',                  fr: 'Laos',                es: 'Laos',               it: 'Laos',              ar: 'لاوس',                    pl: 'Laos',                 nl: 'Laos',               tr: 'Laos' },
  Myanmar:        { en: 'Myanmar',        de: 'Myanmar',               fr: 'Myanmar',             es: 'Myanmar',            it: 'Myanmar',           ar: 'ميانمار',                 pl: 'Mjanma',               nl: 'Myanmar',            tr: 'Myanmar' },
  Malaysia:       { en: 'Malaysia',       de: 'Malaysia',              fr: 'Malaisie',            es: 'Malasia',            it: 'Malaysia',          ar: 'ماليزيا',                 pl: 'Malezja',              nl: 'Maleisië',           tr: 'Malezya' },
  Indonesia:      { en: 'Indonesia',      de: 'Indonesien',            fr: 'Indonésie',           es: 'Indonesia',          it: 'Indonesia',         ar: 'إندونيسيا',                pl: 'Indonezja',            nl: 'Indonesië',          tr: 'Endonezya' },
  Philippines:    { en: 'Philippines',    de: 'Philippinen',           fr: 'Philippines',         es: 'Filipinas',          it: 'Filippine',         ar: 'الفلبين',                 pl: 'Filipiny',             nl: 'Filipijnen',         tr: 'Filipinler' },
  Singapore:      { en: 'Singapore',      de: 'Singapur',              fr: 'Singapour',           es: 'Singapur',           it: 'Singapore',         ar: 'سنغافورة',                 pl: 'Singapur',             nl: 'Singapore',          tr: 'Singapur' },
  'Brunei':       { en: 'Brunei',         de: 'Brunei',                fr: 'Brunei',              es: 'Brunéi',             it: 'Brunei',            ar: 'بروناي',                  pl: 'Brunei',               nl: 'Brunei',             tr: 'Brunei' },

  // ── Oceania ──────────────────────────────────────────────────────────────
  Australia:      { en: 'Australia',      de: 'Australien',            fr: 'Australie',           es: 'Australia',          it: 'Australia',         ar: 'أستراليا',                pl: 'Australia',            nl: 'Australië',          tr: 'Avustralya' },
  'New Zealand':  { en: 'New Zealand',    de: 'Neuseeland',            fr: 'Nouvelle-Zélande',    es: 'Nueva Zelanda',      it: 'Nuova Zelanda',     ar: 'نيوزيلندا',                pl: 'Nowa Zelandia',        nl: 'Nieuw-Zeeland',      tr: 'Yeni Zelanda' },
  'New Caledonia':{ en: 'New Caledonia',  de: 'Neukaledonien',         fr: 'Nouvelle-Calédonie',  es: 'Nueva Caledonia',    it: 'Nuova Caledonia',   ar: 'كاليدونيا الجديدة',         pl: 'Nowa Kaledonia',       nl: 'Nieuw-Caledonië',    tr: 'Yeni Kaledonya' },
  Fiji:           { en: 'Fiji',           de: 'Fidschi',               fr: 'Fidji',               es: 'Fiyi',               it: 'Figi',              ar: 'فيجي',                    pl: 'Fidżi',                nl: 'Fiji',               tr: 'Fiji' },
  'Papua New Guinea': { en: 'Papua New Guinea', de: 'Papua-Neuguinea', fr: 'Papouasie-Nouvelle-Guinée', es: 'Papúa Nueva Guinea', it: 'Papua Nuova Guinea', ar: 'بابوا غينيا الجديدة', pl: 'Papua-Nowa Gwinea', nl: 'Papoea-Nieuw-Guinea', tr: 'Papua Yeni Gine' },
};

// ── Normalisation ───────────────────────────────────────────────────────────
/**
 * Lowercase + NFD-strip diacritics. Same pattern used by the city-translations
 * module so query handling stays consistent across the app.
 *
 * "Tunesien", "TUNESIEN", " Tunesien ", "Tünesien" all collapse to the
 * same key. Arabic / Cyrillic strings normalise to themselves (lowercased,
 * combining marks dropped).
 */
function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ── Indexes ─────────────────────────────────────────────────────────────────
const forward = new Map<string, LocalizedCountry>();
const reverse = new Map<string, string>();

function registerEntry(entry: LocalizedCountry): void {
  const key = normalize(entry.en);
  forward.set(key, entry);
  reverse.set(key, entry.en);
  // Register every locale alias against the same canonical English name.
  // Last-write-wins is fine: if "Korea" appears in two entries we want the
  // canonical with more context (e.g. "South Korea") to claim the alias,
  // and our registration order does that naturally.
  for (const lang of ['de', 'fr', 'es', 'it', 'ar', 'pl', 'nl', 'tr'] as const) {
    const alias = entry[lang];
    if (alias) reverse.set(normalize(alias), entry.en);
  }
}

for (const value of Object.values(TRANSLATIONS)) registerEntry(value);

// ── Public API: forward lookup ──────────────────────────────────────────────
/**
 * Translate the canonical English country name to {@code locale}.
 * Unknown countries pass through unchanged.
 */
export function localizeCountry(country: string, locale: AppLanguage): string {
  if (!country) return country;
  if (locale === 'en') return country;
  const entry = forward.get(normalize(country));
  if (!entry) return country;
  return entry[locale] ?? country;
}

// ── Public API: reverse lookup ──────────────────────────────────────────────
/**
 * Resolve a free-form query in any supported language to the canonical
 * English country name, or {@code null} if no alias matches.
 *
 * <p>This is the entry point that makes "Tunesien" (DE), "tunisia" (EN),
 * "tunisie" (FR), "تونس" (AR), "Tunezja" (PL) all yield {@code "Tunisia"}.
 */
export function resolveCountryAlias(query: string): string | null {
  if (!query) return null;
  return reverse.get(normalize(query)) ?? null;
}

/**
 * Substring-style matcher for use in search filters. Returns {@code true}
 * iff {@code query} matches the country in any of the nine supported
 * languages, after Unicode normalisation.
 *
 * Substring (not exact) so prefix-typing works: "tunes" matches "Tunesien"
 * mid-type, "kor" matches both "Korea" variants, etc.
 */
export function countryNameMatches(canonicalEnglish: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return false;
  const entry = forward.get(normalize(canonicalEnglish));
  if (!entry) {
    // Country isn't in the catalogue — fall back to substring against the
    // raw English so unknown country names still respond to user typing.
    return normalize(canonicalEnglish).includes(q);
  }
  if (normalize(entry.en).includes(q)) return true;
  for (const lang of ['de', 'fr', 'es', 'it', 'ar', 'pl', 'nl', 'tr'] as const) {
    const alias = entry[lang];
    if (alias && normalize(alias).includes(q)) return true;
  }
  return false;
}

// ── ISO-code maps (unchanged from previous module) ──────────────────────────
/** Map canonical country name → ISO-3166 alpha-2 code, for flag lookups. */
const NAME_TO_CODE: Record<string, string> = {
  // Europe
  Germany: 'de', France: 'fr', Italy: 'it', Spain: 'es', Portugal: 'pt',
  UK: 'gb', 'United Kingdom': 'gb', Netherlands: 'nl', Belgium: 'be',
  Switzerland: 'ch', Austria: 'at', Liechtenstein: 'li', Luxembourg: 'lu',
  Ireland: 'ie', Denmark: 'dk', Sweden: 'se', Norway: 'no', Finland: 'fi',
  Iceland: 'is', Poland: 'pl', Czechia: 'cz', 'Czech Republic': 'cz',
  Slovakia: 'sk', Hungary: 'hu', Romania: 'ro', Bulgaria: 'bg', Slovenia: 'si',
  Croatia: 'hr', Serbia: 'rs', Montenegro: 'me', 'North Macedonia': 'mk',
  'Bosnia and Herzegovina': 'ba', Albania: 'al', Kosovo: 'xk',
  Greece: 'gr', Cyprus: 'cy', Malta: 'mt', Turkey: 'tr',
  Russia: 'ru', Ukraine: 'ua', Belarus: 'by', Moldova: 'md',
  Latvia: 'lv', Lithuania: 'lt', Estonia: 'ee', Monaco: 'mc', Andorra: 'ad',
  // Caucasus & Central Asia
  Georgia: 'ge', Armenia: 'am', Azerbaijan: 'az',
  Kazakhstan: 'kz', Uzbekistan: 'uz', Turkmenistan: 'tm', Kyrgyzstan: 'kg',
  Tajikistan: 'tj', Mongolia: 'mn', Afghanistan: 'af',
  // Middle East / North Africa
  UAE: 'ae', 'United Arab Emirates': 'ae', 'Saudi Arabia': 'sa', Qatar: 'qa',
  Oman: 'om', Kuwait: 'kw', Bahrain: 'bh', Yemen: 'ye',
  Iraq: 'iq', Iran: 'ir', Israel: 'il', Palestine: 'ps',
  Jordan: 'jo', Lebanon: 'lb', Syria: 'sy',
  Egypt: 'eg', Libya: 'ly', Tunisia: 'tn', Algeria: 'dz', Morocco: 'ma', Sudan: 'sd',
  // Sub-Saharan Africa
  'South Africa': 'za', Nigeria: 'ng', Kenya: 'ke', Ethiopia: 'et',
  Tanzania: 'tz', Ghana: 'gh', Senegal: 'sn', 'Ivory Coast': 'ci',
  Cameroon: 'cm', Rwanda: 'rw', Uganda: 'ug', Angola: 'ao', Mozambique: 'mz',
  Zimbabwe: 'zw', Madagascar: 'mg', Mauritius: 'mu', Seychelles: 'sc',
  // Americas
  USA: 'us', 'United States': 'us', Canada: 'ca', Mexico: 'mx',
  Brazil: 'br', Argentina: 'ar', Chile: 'cl', Colombia: 'co', Peru: 'pe',
  Venezuela: 've', Ecuador: 'ec', Bolivia: 'bo', Uruguay: 'uy', Paraguay: 'py',
  Cuba: 'cu', Panama: 'pa', 'Costa Rica': 'cr',
  'Dominican Republic': 'do', Jamaica: 'jm', Guadeloupe: 'gp',
  // Asia-Pacific
  China: 'cn', Japan: 'jp', 'South Korea': 'kr', 'North Korea': 'kp',
  Taiwan: 'tw', 'Hong Kong': 'hk', Macau: 'mo',
  India: 'in', Pakistan: 'pk', Bangladesh: 'bd', 'Sri Lanka': 'lk',
  Nepal: 'np', Bhutan: 'bt', Maldives: 'mv',
  Thailand: 'th', Vietnam: 'vn', Cambodia: 'kh', Laos: 'la', Myanmar: 'mm',
  Malaysia: 'my', Indonesia: 'id', Philippines: 'ph', Singapore: 'sg', Brunei: 'bn',
  Australia: 'au', 'New Zealand': 'nz', 'New Caledonia': 'nc', Fiji: 'fj',
  'Papua New Guinea': 'pg',
};

export function countryToCode(country: string): string {
  if (!country) return '';
  // Check the catalogue first so "UK" (which is in NAME_TO_CODE under the
  // English shorthand) correctly returns its ISO-2 code "gb", not "uk".
  // Real two-letter ISO inputs (e.g. "DE", "us") fall through to the
  // lowercase pass below.
  const mapped = NAME_TO_CODE[country];
  if (mapped) return mapped;
  if (country.length === 2) return country.toLowerCase();
  return '';
}

/** Inverse map: ISO-2 → canonical English name. */
const CODE_TO_NAME: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  // Build incrementally so that for codes shared by two canonical names
  // (e.g. "USA" / "United States" both → "us"), the first declaration wins.
  for (const [name, code] of Object.entries(NAME_TO_CODE)) {
    if (!(code in out)) out[code] = name;
  }
  return out;
})();

/**
 * Convert an ISO-2 country code to a canonical English name. Falls back to
 * the uppercase code if unknown so the UI shows *something* instead of an
 * empty string.
 */
export function codeToCountryName(code: string): string {
  if (!code) return '';
  return CODE_TO_NAME[code.toLowerCase()] ?? code.toUpperCase();
}

// ── Back-compat exports ─────────────────────────────────────────────────────
/**
 * @deprecated Back-compat export kept for callers that still consume the
 * raw object shape. New callers should use {@link localizeCountry} /
 * {@link resolveCountryAlias} / {@link countryNameMatches}.
 *
 * The shape changed slightly: each value is a {@link LocalizedCountry} with
 * all nine locales available instead of the previous {de, fr} only.
 */
export const COUNTRY_TRANSLATIONS: Record<string, LocalizedCountry> = TRANSLATIONS;

/**
 * Enumerate all known canonical English country names. Stable order based on
 * declaration order in {@link TRANSLATIONS} — useful for tests and for
 * generating an "all countries" picker without re-traversing the index.
 */
export function knownCountries(): string[] {
  return Object.keys(TRANSLATIONS);
}
