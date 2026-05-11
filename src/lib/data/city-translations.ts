import type { AppLanguage } from '@/lib/types';

/**
 * Localized city names for the three locales this app ships with: {@code en},
 * {@code de}, {@code fr}.
 *
 * <h3>Two lookup directions</h3>
 * <ul>
 *   <li><b>Forward</b> ({@link localizeCity}) — given the canonical English
 *       name (what {@code airports.json} stores) plus the active locale, return
 *       the correct variant to show the user. "Nice" in German → "Nizza".</li>
 *   <li><b>Reverse</b> ({@link resolveCityAlias}, {@link cityNameMatches}) —
 *       given a free-form query in any of the three languages, work out which
 *       canonical English city it refers to. This is what powers "typing Nizza
 *       finds Nice airports".</li>
 * </ul>
 *
 * <h3>Three data layers (highest to lowest precedence)</h3>
 * <ol>
 *   <li><b>CURATED_OVERRIDES</b> (hard-coded, ~100 world-class airport cities)
 *       — manually reviewed, always wins. This is where data-quality bugs in
 *       the upstream dataset get pinned in place (e.g. the upstream sometimes
 *       gives {@code de: "Zuerich"} — the override forces "Zürich").</li>
 *   <li><b>Runtime-loaded {@code city-i18n.json}</b> (~5000 cities, 220 KB)
 *       fetched at boot. Good fallback coverage for medium-sized cities.</li>
 *   <li><b>Original English name</b> — if nothing else matches we return the
 *       input unchanged. Always safe.</li>
 * </ol>
 */

// ── Types ────────────────────────────────────────────────────────────────────
type LocalizedNames = {
  en: string;
  de?: string;
  fr?: string;
  es?: string;
  it?: string;
  ar?: string;
};

// ── Layer 1: Curated overrides for top-tier airport cities ──────────────────
/**
 * Hand-curated translations for the world's busiest airport cities. Every
 * entry here has been sanity-checked against actual German / French usage
 * — unlike the upstream dataset which sometimes returns historical names
 * (Bombay, Konstantinopel), slang (Pantruche, Jo'anna) or typos (Zuerich).
 *
 * Keys are the canonical English name as used in airports.json's `n` field.
 * Alphabetised by region for maintainability.
 */
const CURATED_OVERRIDES: Record<string, LocalizedNames> = {
  // ── Europe — German / Austrian / Swiss ────────────────────────────────────
  Munich:       { en: 'Munich',       de: 'München',     fr: 'Munich' },
  Cologne:      { en: 'Cologne',      de: 'Köln',        fr: 'Cologne' },
  Nuremberg:    { en: 'Nuremberg',    de: 'Nürnberg',    fr: 'Nuremberg' },
  Dusseldorf:   { en: 'Dusseldorf',   de: 'Düsseldorf',  fr: 'Düsseldorf' },
  Hanover:      { en: 'Hanover',      de: 'Hannover',    fr: 'Hanovre' },
  Vienna:       { en: 'Vienna',       de: 'Wien',        fr: 'Vienne' },
  Zurich:       { en: 'Zurich',       de: 'Zürich',      fr: 'Zurich' },
  Geneva:       { en: 'Geneva',       de: 'Genf',        fr: 'Genève' },
  Basel:        { en: 'Basel',        de: 'Basel',       fr: 'Bâle' },
  Bern:         { en: 'Bern',         de: 'Bern',        fr: 'Berne' },

  // ── Europe — Romance & Benelux ────────────────────────────────────────────
  Nice:         { en: 'Nice',         de: 'Nizza',       fr: 'Nice' },
  Lyon:         { en: 'Lyon',         de: 'Lyon',        fr: 'Lyon' },
  Marseille:    { en: 'Marseille',    de: 'Marseille',   fr: 'Marseille' },
  Strasbourg:   { en: 'Strasbourg',   de: 'Straßburg',   fr: 'Strasbourg' },
  Brussels:     { en: 'Brussels',     de: 'Brüssel',     fr: 'Bruxelles' },
  Antwerp:      { en: 'Antwerp',      de: 'Antwerpen',   fr: 'Anvers' },
  Rome:         { en: 'Rome',         de: 'Rom',         fr: 'Rome' },
  Milan:        { en: 'Milan',        de: 'Mailand',     fr: 'Milan' },
  Venice:       { en: 'Venice',       de: 'Venedig',     fr: 'Venise' },
  Florence:     { en: 'Florence',     de: 'Florenz',     fr: 'Florence' },
  Naples:       { en: 'Naples',       de: 'Neapel',      fr: 'Naples' },
  Turin:        { en: 'Turin',        de: 'Turin',       fr: 'Turin' },
  Bologna:      { en: 'Bologna',      de: 'Bologna',     fr: 'Bologne' },
  Genoa:        { en: 'Genoa',        de: 'Genua',       fr: 'Gênes' },
  // Spain
  Madrid:       { en: 'Madrid',       de: 'Madrid',      fr: 'Madrid' },
  Seville:      { en: 'Seville',      de: 'Sevilla',     fr: 'Séville' },
  Valencia:     { en: 'Valencia',     de: 'Valencia',    fr: 'Valence' },
  Malaga:       { en: 'Málaga',       de: 'Málaga',      fr: 'Malaga' },
  Bilbao:       { en: 'Bilbao',       de: 'Bilbao',      fr: 'Bilbao' },
  Zaragoza:     { en: 'Zaragoza',     de: 'Saragossa',   fr: 'Saragosse' },
  Majorca:      { en: 'Majorca',      de: 'Mallorca',    fr: 'Majorque' },
  // Portugal
  Porto:        { en: 'Porto',        de: 'Porto',       fr: 'Porto' },

  // ── Europe — Nordic / Baltic / Slavic ─────────────────────────────────────
  Copenhagen:   { en: 'Copenhagen',   de: 'Kopenhagen',  fr: 'Copenhague' },
  Stockholm:    { en: 'Stockholm',    de: 'Stockholm',   fr: 'Stockholm' },
  Gothenburg:   { en: 'Gothenburg',   de: 'Göteborg',    fr: 'Göteborg' },
  Helsinki:     { en: 'Helsinki',     de: 'Helsinki',    fr: 'Helsinki' },
  Oslo:         { en: 'Oslo',         de: 'Oslo',        fr: 'Oslo' },
  Bergen:       { en: 'Bergen',       de: 'Bergen',      fr: 'Bergen' },
  Prague:       { en: 'Prague',       de: 'Prag',        fr: 'Prague' },
  Warsaw:       { en: 'Warsaw',       de: 'Warschau',    fr: 'Varsovie' },
  Krakow:       { en: 'Krakow',       de: 'Krakau',      fr: 'Cracovie' },
  Wroclaw:      { en: 'Wroclaw',      de: 'Breslau',     fr: 'Wrocław' },
  Gdansk:       { en: 'Gdansk',       de: 'Danzig',      fr: 'Gdańsk' },
  Budapest:     { en: 'Budapest',     de: 'Budapest',    fr: 'Budapest' },
  Bucharest:    { en: 'Bucharest',    de: 'Bukarest',    fr: 'Bucarest' },
  // Note: force modern name — upstream still returns "Preßburg" (historical).
  Bratislava:   { en: 'Bratislava',   de: 'Bratislava',  fr: 'Bratislava' },
  Ljubljana:    { en: 'Ljubljana',    de: 'Ljubljana',   fr: 'Ljubljana' },
  // Note: force modern name — upstream still returns "Agram" (historical).
  Zagreb:       { en: 'Zagreb',       de: 'Zagreb',      fr: 'Zagreb' },
  Belgrade:     { en: 'Belgrade',     de: 'Belgrad',     fr: 'Belgrade' },
  Sarajevo:     { en: 'Sarajevo',     de: 'Sarajevo',    fr: 'Sarajevo' },
  Sofia:        { en: 'Sofia',        de: 'Sofia',       fr: 'Sofia' },
  Skopje:       { en: 'Skopje',       de: 'Skopje',      fr: 'Skopje' },
  Tirana:       { en: 'Tirana',       de: 'Tirana',      fr: 'Tirana' },
  Thessaloniki: { en: 'Thessaloniki', de: 'Thessaloniki',fr: 'Thessalonique' },
  // Note: force modern name — upstream still returns "Revel" (pre-independence).
  Tallinn:      { en: 'Tallinn',      de: 'Tallinn',     fr: 'Tallinn' },
  Riga:         { en: 'Riga',         de: 'Riga',        fr: 'Riga' },
  Vilnius:      { en: 'Vilnius',      de: 'Vilnius',     fr: 'Vilnius' },
  Minsk:        { en: 'Minsk',        de: 'Minsk',       fr: 'Minsk' },
  Chisinau:     { en: 'Chișinău',     de: 'Kischinau',   fr: 'Chișinău' },
  Moscow:       { en: 'Moscow',       de: 'Moskau',      fr: 'Moscou' },
  'Saint Petersburg': { en: 'Saint Petersburg', de: 'Sankt Petersburg', fr: 'Saint-Pétersbourg' },
  Kyiv:         { en: 'Kyiv',         de: 'Kiew',        fr: 'Kiev' },
  // Caucasus
  Tbilisi:      { en: 'Tbilisi',      de: 'Tiflis',      fr: 'Tbilissi' },
  Yerevan:      { en: 'Yerevan',      de: 'Jerewan',     fr: 'Erevan' },
  Baku:         { en: 'Baku',         de: 'Baku',        fr: 'Bakou' },

  // ── Europe — Mediterranean ────────────────────────────────────────────────
  Athens:       { en: 'Athens',       de: 'Athen',       fr: 'Athènes' },
  Istanbul:     { en: 'Istanbul',     de: 'Istanbul',    fr: 'Istanbul' },
  Lisbon:       { en: 'Lisbon',       de: 'Lissabon',    fr: 'Lisbonne' },

  // ── UK & Ireland ──────────────────────────────────────────────────────────
  London:       { en: 'London',       de: 'London',      fr: 'Londres' },
  Edinburgh:    { en: 'Edinburgh',    de: 'Edinburgh',   fr: 'Édimbourg' },
  Dublin:       { en: 'Dublin',       de: 'Dublin',      fr: 'Dublin' },

  // ── Middle East / North Africa ────────────────────────────────────────────
  Cairo:        { en: 'Cairo',        de: 'Kairo',       fr: 'Le Caire' },
  Algiers:      { en: 'Algiers',      de: 'Algier',      fr: 'Alger' },
  Tunis:        { en: 'Tunis',        de: 'Tunis',       fr: 'Tunis' },
  Casablanca:   { en: 'Casablanca',   de: 'Casablanca',  fr: 'Casablanca' },
  Marrakech:    { en: 'Marrakech',    de: 'Marrakesch',  fr: 'Marrakech' },
  Jeddah:       { en: 'Jeddah',       de: 'Dschidda',    fr: 'Djeddah' },
  Riyadh:       { en: 'Riyadh',       de: 'Riad',        fr: 'Riyad' },
  'Abu Dhabi':  { en: 'Abu Dhabi',    de: 'Abu Dhabi',   fr: 'Abou Dabi' },
  Dubai:        { en: 'Dubai',        de: 'Dubai',       fr: 'Dubaï' },
  Doha:         { en: 'Doha',         de: 'Doha',        fr: 'Doha' },
  'Tel Aviv':   { en: 'Tel Aviv',     de: 'Tel Aviv',    fr: 'Tel-Aviv' },
  Jerusalem:    { en: 'Jerusalem',    de: 'Jerusalem',   fr: 'Jérusalem' },
  Damascus:     { en: 'Damascus',     de: 'Damaskus',    fr: 'Damas' },
  Baghdad:      { en: 'Baghdad',      de: 'Bagdad',      fr: 'Bagdad' },
  Tehran:       { en: 'Tehran',       de: 'Teheran',     fr: 'Téhéran' },
  Isfahan:      { en: 'Isfahan',      de: 'Isfahan',     fr: 'Ispahan' },
  Mashhad:      { en: 'Mashhad',      de: 'Maschhad',    fr: 'Mashhad' },   // upstream has "Alexandria" — wrong!
  Beirut:       { en: 'Beirut',       de: 'Beirut',      fr: 'Beyrouth' },
  Amman:        { en: 'Amman',        de: 'Amman',       fr: 'Amman' },
  Muscat:       { en: 'Muscat',       de: 'Maskat',      fr: 'Mascate' },
  'Kuwait City':{ en: 'Kuwait City',  de: 'Kuwait-Stadt',fr: 'Koweït' },
  Manama:       { en: 'Manama',       de: 'Manama',      fr: 'Manama' },
  Medina:       { en: 'Medina',       de: 'Medina',      fr: 'Médine' },
  Mecca:        { en: 'Mecca',        de: 'Mekka',       fr: 'La Mecque' },
  Tripoli:      { en: 'Tripoli',      de: 'Tripolis',    fr: 'Tripoli' },

  // ── Sub-Saharan Africa ────────────────────────────────────────────────────
  Nairobi:      { en: 'Nairobi',      de: 'Nairobi',     fr: 'Nairobi' },
  Johannesburg: { en: 'Johannesburg', de: 'Johannesburg', fr: 'Johannesbourg' },
  'Cape Town':  { en: 'Cape Town',    de: 'Kapstadt',    fr: 'Le Cap' },
  Durban:       { en: 'Durban',       de: 'Durban',      fr: 'Durban' },
  Lagos:        { en: 'Lagos',        de: 'Lagos',       fr: 'Lagos' },
  Abuja:        { en: 'Abuja',        de: 'Abuja',       fr: 'Abuja' },
  Accra:        { en: 'Accra',        de: 'Accra',       fr: 'Accra' },
  'Addis Ababa':{ en: 'Addis Ababa',  de: 'Addis Abeba', fr: 'Addis-Abeba' },
  Khartoum:     { en: 'Khartoum',     de: 'Khartum',     fr: 'Khartoum' },
  'Dar es Salaam': { en: 'Dar es Salaam', de: 'Daressalam', fr: 'Dar es Salaam' },
  Kigali:       { en: 'Kigali',       de: 'Kigali',      fr: 'Kigali' },
  Kampala:      { en: 'Kampala',      de: 'Kampala',     fr: 'Kampala' },
  Luanda:       { en: 'Luanda',       de: 'Luanda',      fr: 'Luanda' },
  Harare:       { en: 'Harare',       de: 'Harare',      fr: 'Harare' },
  Dakar:        { en: 'Dakar',        de: 'Dakar',       fr: 'Dakar' },
  Abidjan:      { en: 'Abidjan',      de: 'Abidjan',     fr: 'Abidjan' },

  // ── Asia ──────────────────────────────────────────────────────────────────
  Beijing:      { en: 'Beijing',      de: 'Peking',      fr: 'Pékin' },
  Shanghai:     { en: 'Shanghai',     de: 'Schanghai',   fr: 'Shanghai' },
  Guangzhou:    { en: 'Guangzhou',    de: 'Guangzhou',   fr: 'Canton' },
  'Hong Kong':  { en: 'Hong Kong',    de: 'Hongkong',    fr: 'Hong Kong' },
  Taipei:       { en: 'Taipei',       de: 'Taipeh',      fr: 'Taipei' },
  Tokyo:        { en: 'Tokyo',        de: 'Tokio',       fr: 'Tokyo' },
  Osaka:        { en: 'Osaka',        de: 'Osaka',       fr: 'Osaka' },
  Kyoto:        { en: 'Kyoto',        de: 'Kyōto',       fr: 'Kyoto' },
  Seoul:        { en: 'Seoul',        de: 'Seoul',       fr: 'Séoul' },
  Singapore:    { en: 'Singapore',    de: 'Singapur',    fr: 'Singapour' },
  Bangkok:      { en: 'Bangkok',      de: 'Bangkok',     fr: 'Bangkok' },
  Hanoi:        { en: 'Hanoi',        de: 'Hanoi',       fr: 'Hanoï' },
  'Ho Chi Minh City': { en: 'Ho Chi Minh City', de: 'Ho-Chi-Minh-Stadt', fr: 'Hô Chi Minh-Ville' },
  Manila:       { en: 'Manila',       de: 'Manila',      fr: 'Manille' },
  Jakarta:      { en: 'Jakarta',      de: 'Jakarta',     fr: 'Jakarta' },
  'Kuala Lumpur': { en: 'Kuala Lumpur', de: 'Kuala Lumpur', fr: 'Kuala Lumpur' },
  // More East Asia & Japan secondary hubs
  Shenzhen:     { en: 'Shenzhen',     de: 'Shenzhen',    fr: 'Shenzhen' },
  Chengdu:      { en: 'Chengdu',      de: 'Chengdu',     fr: 'Chengdu' },
  Chongqing:    { en: 'Chongqing',    de: 'Chongqing',   fr: 'Chongqing' },
  'Xi\'an':     { en: "Xi'an",        de: "Xi'an",       fr: "Xi'an" },
  Wuhan:        { en: 'Wuhan',        de: 'Wuhan',       fr: 'Wuhan' },
  Nanjing:      { en: 'Nanjing',      de: 'Nanking',     fr: 'Nankin' },
  Macau:        { en: 'Macau',        de: 'Macao',       fr: 'Macao' },
  Nagoya:       { en: 'Nagoya',       de: 'Nagoya',      fr: 'Nagoya' },
  Sapporo:      { en: 'Sapporo',      de: 'Sapporo',     fr: 'Sapporo' },
  Fukuoka:      { en: 'Fukuoka',      de: 'Fukuoka',     fr: 'Fukuoka' },
  Busan:        { en: 'Busan',        de: 'Busan',       fr: 'Busan' },   // upstream has "Pusan" (old romanisation)
  // Indian sub-continent
  Mumbai:       { en: 'Mumbai',       de: 'Mumbai',      fr: 'Bombay' },
  Delhi:        { en: 'Delhi',        de: 'Delhi',       fr: 'Delhi' },
  Kolkata:      { en: 'Kolkata',      de: 'Kalkutta',    fr: 'Calcutta' },
  Chennai:      { en: 'Chennai',      de: 'Chennai',     fr: 'Chennai' },
  Bangalore:    { en: 'Bangalore',    de: 'Bangalore',   fr: 'Bangalore' },
  Hyderabad:    { en: 'Hyderabad',    de: 'Hyderabad',   fr: 'Hyderabad' },
  Karachi:      { en: 'Karachi',      de: 'Karatschi',   fr: 'Karachi' },
  Lahore:       { en: 'Lahore',       de: 'Lahore',      fr: 'Lahore' },
  Islamabad:    { en: 'Islamabad',    de: 'Islamabad',   fr: 'Islamabad' },
  Colombo:      { en: 'Colombo',      de: 'Colombo',     fr: 'Colombo' },
  Dhaka:        { en: 'Dhaka',        de: 'Dhaka',       fr: 'Dacca' },
  Kathmandu:    { en: 'Kathmandu',    de: 'Kathmandu',   fr: 'Katmandou' },
  // Further SE Asia
  Yangon:       { en: 'Yangon',       de: 'Rangun',      fr: 'Rangoun' },
  'Phnom Penh': { en: 'Phnom Penh',   de: 'Phnom Penh',  fr: 'Phnom Penh' },
  Vientiane:    { en: 'Vientiane',    de: 'Vientiane',   fr: 'Vientiane' },
  // Central Asia
  Almaty:       { en: 'Almaty',       de: 'Almaty',      fr: 'Almaty' },   // upstream has "Werny" (tsarist era)
  Astana:       { en: 'Astana',       de: 'Astana',      fr: 'Astana' },
  Tashkent:     { en: 'Tashkent',     de: 'Taschkent',   fr: 'Tachkent' },
  Ulaanbaatar:  { en: 'Ulaanbaatar',  de: 'Ulan-Bator',  fr: 'Oulan-Bator' },

  // ── North America ────────────────────────────────────────────────────────
  // US city names are usually identical across locales, so these overrides
  // mostly exist so the reverse-lookup table recognises them as known entities.
  'New York':   { en: 'New York',     de: 'New York',    fr: 'New York' },
  'Los Angeles':{ en: 'Los Angeles',  de: 'Los Angeles', fr: 'Los Angeles' },
  Chicago:      { en: 'Chicago',      de: 'Chicago',     fr: 'Chicago' },
  Philadelphia: { en: 'Philadelphia', de: 'Philadelphia',fr: 'Philadelphie' },
  'San Francisco': { en: 'San Francisco', de: 'San Francisco', fr: 'San Francisco' },
  Seattle:      { en: 'Seattle',      de: 'Seattle',     fr: 'Seattle' },
  Boston:       { en: 'Boston',       de: 'Boston',      fr: 'Boston' },
  Miami:        { en: 'Miami',        de: 'Miami',       fr: 'Miami' },
  Atlanta:      { en: 'Atlanta',      de: 'Atlanta',     fr: 'Atlanta' },
  Houston:      { en: 'Houston',      de: 'Houston',     fr: 'Houston' },
  Dallas:       { en: 'Dallas',       de: 'Dallas',      fr: 'Dallas' },
  Denver:       { en: 'Denver',       de: 'Denver',      fr: 'Denver' },
  'Las Vegas':  { en: 'Las Vegas',    de: 'Las Vegas',   fr: 'Las Vegas' },
  Phoenix:      { en: 'Phoenix',      de: 'Phoenix',     fr: 'Phoenix' },
  Washington:   { en: 'Washington',   de: 'Washington',  fr: 'Washington' },
  Orlando:      { en: 'Orlando',      de: 'Orlando',     fr: 'Orlando' },
  Detroit:      { en: 'Detroit',      de: 'Detroit',     fr: 'Détroit' },
  Pittsburgh:   { en: 'Pittsburgh',   de: 'Pittsburgh',  fr: 'Pittsburgh' },
  Minneapolis:  { en: 'Minneapolis',  de: 'Minneapolis', fr: 'Minneapolis' },
  Charlotte:    { en: 'Charlotte',    de: 'Charlotte',   fr: 'Charlotte' },
  Nashville:    { en: 'Nashville',    de: 'Nashville',   fr: 'Nashville' },
  'New Orleans':{ en: 'New Orleans',  de: 'New Orleans', fr: 'La Nouvelle-Orléans' },
  'Salt Lake City': { en: 'Salt Lake City', de: 'Salt Lake City', fr: 'Salt Lake City' },
  'Kansas City':{ en: 'Kansas City',  de: 'Kansas City', fr: 'Kansas City' },
  'St. Louis':  { en: 'St. Louis',    de: 'St. Louis',   fr: 'Saint-Louis' },
  Cincinnati:   { en: 'Cincinnati',   de: 'Cincinnati',  fr: 'Cincinnati' },
  'San Diego':  { en: 'San Diego',    de: 'San Diego',   fr: 'San Diego' },
  Tampa:        { en: 'Tampa',        de: 'Tampa',       fr: 'Tampa' },
  Portland:     { en: 'Portland',     de: 'Portland',    fr: 'Portland' },

  // Canada
  Toronto:      { en: 'Toronto',      de: 'Toronto',     fr: 'Toronto' },
  Montreal:     { en: 'Montreal',     de: 'Montréal',    fr: 'Montréal' },
  Quebec:       { en: 'Quebec',       de: 'Québec',      fr: 'Québec' },
  Vancouver:    { en: 'Vancouver',    de: 'Vancouver',   fr: 'Vancouver' },
  Ottawa:       { en: 'Ottawa',       de: 'Ottawa',      fr: 'Ottawa' },
  Calgary:      { en: 'Calgary',      de: 'Calgary',     fr: 'Calgary' },
  Edmonton:     { en: 'Edmonton',     de: 'Edmonton',    fr: 'Edmonton' },
  Winnipeg:     { en: 'Winnipeg',     de: 'Winnipeg',    fr: 'Winnipeg' },
  Halifax:      { en: 'Halifax',      de: 'Halifax',     fr: 'Halifax' },

  // Latin America
  'Mexico City':{ en: 'Mexico City',  de: 'Mexiko-Stadt',fr: 'Mexico' },
  Cancun:       { en: 'Cancún',       de: 'Cancún',      fr: 'Cancún' },
  Guadalajara:  { en: 'Guadalajara',  de: 'Guadalajara', fr: 'Guadalajara' },
  'Sao Paulo':  { en: 'São Paulo',    de: 'São Paulo',   fr: 'São Paulo' },
  'Rio de Janeiro': { en: 'Rio de Janeiro', de: 'Rio de Janeiro', fr: 'Rio de Janeiro' },
  Brasilia:     { en: 'Brasília',     de: 'Brasília',    fr: 'Brasilia' },
  'Buenos Aires': { en: 'Buenos Aires', de: 'Buenos Aires', fr: 'Buenos Aires' },
  Lima:         { en: 'Lima',         de: 'Lima',        fr: 'Lima' },
  Santiago:     { en: 'Santiago',     de: 'Santiago de Chile', fr: 'Santiago du Chili' },
  Bogota:       { en: 'Bogota',       de: 'Bogotá',      fr: 'Bogota' },
  Caracas:      { en: 'Caracas',      de: 'Caracas',     fr: 'Caracas' },
  Quito:        { en: 'Quito',        de: 'Quito',       fr: 'Quito' },
  'La Paz':     { en: 'La Paz',       de: 'La Paz',      fr: 'La Paz' },
  Montevideo:   { en: 'Montevideo',   de: 'Montevideo',  fr: 'Montevideo' },
  Asuncion:     { en: 'Asunción',     de: 'Asunción',    fr: 'Asuncion' },
  'Panama City':{ en: 'Panama City',  de: 'Panama-Stadt',fr: 'Panama' },
  'Guatemala City': { en: 'Guatemala City', de: 'Guatemala-Stadt', fr: 'Guatemala' },
  'San Jose':   { en: 'San José',     de: 'San José',    fr: 'San José' },
  Havana:       { en: 'Havana',       de: 'Havanna',     fr: 'La Havane' },
  'Santo Domingo': { en: 'Santo Domingo', de: 'Santo Domingo', fr: 'Saint-Domingue' },

  // Oceania
  Sydney:       { en: 'Sydney',       de: 'Sydney',      fr: 'Sydney' },
  Melbourne:    { en: 'Melbourne',    de: 'Melbourne',   fr: 'Melbourne' },
  Brisbane:     { en: 'Brisbane',     de: 'Brisbane',    fr: 'Brisbane' },
  Perth:        { en: 'Perth',        de: 'Perth',       fr: 'Perth' },
  Auckland:     { en: 'Auckland',     de: 'Auckland',    fr: 'Auckland' },
};

// ── Normalisation ───────────────────────────────────────────────────────────
/**
 * Lowercase + NFD-strip: "Düsseldorf" → "dusseldorf", "München" → "munchen".
 * Used both as the reverse-index key and as the query normaliser, so
 * "NIZZA", "nizza", and " Nizza " all resolve to the same entry.
 */
function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ── Dynamic merged state ─────────────────────────────────────────────────────
const forward = new Map<string, LocalizedNames>();
const reverse = new Map<string, string>();

function registerEntry(entry: LocalizedNames) {
  const key = normalize(entry.en);
  forward.set(key, entry);
  reverse.set(key, entry.en);
  if (entry.de) reverse.set(normalize(entry.de), entry.en);
  if (entry.fr) reverse.set(normalize(entry.fr), entry.en);
}

// Seed with the curated layer — never overwritten by runtime load.
for (const value of Object.values(CURATED_OVERRIDES)) registerEntry(value);

// ── Runtime loader ───────────────────────────────────────────────────────────
let loadPromise: Promise<void> | null = null;

/**
 * Fetch-and-merge {@code public/data/city-i18n.json} into the lookup tables.
 * Safe to call from any browser component — the underlying promise is cached
 * so parallel callers share one network request. No-op on the server.
 *
 * Runtime entries are added only if the normalised English key is not already
 * claimed by {@link CURATED_OVERRIDES} — the curated table always wins.
 */
export function loadCityI18n(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch('/data/city-i18n.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = (await res.json()) as Record<string, LocalizedNames>;
      for (const value of Object.values(data)) {
        const key = normalize(value.en);
        if (forward.has(key)) continue;      // curated wins
        registerEntry(value);
      }
    } catch (err) {
      loadPromise = null;
       
      console.error('[city-i18n] failed to load', err);
    }
  })();
  return loadPromise;
}

// ── Compound-name handling ───────────────────────────────────────────────────
/**
 * Many airport datasets list names like "London Heathrow", "Rome Fiumicino",
 * "Paris CDG" — a city prefix followed by an airport-specific qualifier.
 * We try to translate just the city prefix while leaving the rest intact.
 *
 * Algorithm: split on first whitespace; if the prefix alone is a known city
 * AND has a translation, return {@code translatedPrefix + " " + rest}.
 * Otherwise return the original string unchanged.
 *
 * @example
 *   translateCompound('Rome Fiumicino', 'de') === 'Rom Fiumicino'
 *   translateCompound('London Heathrow', 'fr') === 'Londres Heathrow'
 *   translateCompound('Paris CDG', 'de')       === 'Paris CDG'    // (no de diff)
 *   translateCompound('Unknown Place', 'de')   === 'Unknown Place' // fallback
 */
function translateCompound(name: string, locale: AppLanguage): string | null {
  const firstSpace = name.indexOf(' ');
  if (firstSpace <= 0) return null;
  const prefix = name.slice(0, firstSpace);
  const rest   = name.slice(firstSpace + 1);
  const entry  = forward.get(normalize(prefix));
  if (!entry) return null;
  const translatedPrefix = entry[locale] ?? entry.en;
  if (translatedPrefix === prefix) return null; // no actual change
  return translatedPrefix + ' ' + rest;
}

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Localize a city or airport label. Unknown inputs pass through unchanged.
 *
 * Lookup order:
 *   1. Exact match against the merged forward table
 *   2. Compound-name match ("London Heathrow" → "Londres Heathrow")
 *   3. Return the input unchanged
 */
export function localizeCity(city: string, locale: AppLanguage): string {
  if (!city) return city;
  if (locale === 'en') return city;
  const entry = forward.get(normalize(city));
  if (entry) return entry[locale] ?? city;
  const compound = translateCompound(city, locale);
  return compound ?? city;
}

/**
 * Resolve a free-form query in any supported language to the canonical
 * English name, or {@code null} if the query doesn't exactly match any
 * known translation.
 */
export function resolveCityAlias(query: string): string | null {
  if (!query) return null;
  return reverse.get(normalize(query)) ?? null;
}

/**
 * Substring-search entry point for the airport-search feature. Returns
 * {@code true} if {@code query} substring-matches {@code cityEnglishName}
 * in any of the supported languages.
 *
 * Also handles compound names — typing "Nizza" matches "Nice Côte d'Azur"
 * because we split on whitespace and check each chunk.
 */
export function cityNameMatches(cityEnglishName: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return false;
  const whole = forward.get(normalize(cityEnglishName));
  if (whole) {
    if (normalize(whole.en).includes(q)) return true;
    if (whole.de && normalize(whole.de).includes(q)) return true;
    if (whole.fr && normalize(whole.fr).includes(q)) return true;
  }
  // Try the compound prefix ("London Heathrow" → look up "London")
  const firstSpace = cityEnglishName.indexOf(' ');
  if (firstSpace > 0) {
    const prefix = cityEnglishName.slice(0, firstSpace);
    const entry  = forward.get(normalize(prefix));
    if (entry) {
      if (normalize(entry.en).includes(q)) return true;
      if (entry.de && normalize(entry.de).includes(q)) return true;
      if (entry.fr && normalize(entry.fr).includes(q)) return true;
    }
  }
  // Final fallback — plain substring against the raw English.
  return normalize(cityEnglishName).includes(q);
}

/**
 * @deprecated Back-compat export. New callers should use {@link localizeCity}.
 */
export const CITY_TRANSLATIONS = CURATED_OVERRIDES;
