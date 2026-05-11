'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MapStyle } from '@/lib/types';
import { AIRPORTS } from '@/lib/data/airports';
import { getCachedWeather, prefetchAirportWeather, useWeatherCacheTick } from '@/components/map/hooks/useAirportWeather';
import { getWeatherEmoji } from '@/lib/utils/weather';

/**
 * Tiered airport coverage. Each tier governs the minimum zoom at which
 * the airport's IATA-coded label appears on the map.
 *
 * Tier choice rules:
 *   * tier 1 (zoom ≥ 4) — global hubs PLUS at least one capital-level
 *     airport per major country. Visible from continent view.
 *   * tier 2 (zoom ≥ 6) — second-tier nationals; together with tier 1
 *     this gives "≥ 3 per country" for North Africa + Middle East and
 *     "≥ 1 per country" everywhere in Asia / Sub-Saharan Africa.
 *   * tier 3 (zoom ≥ 8) — regional + secondary city airports.
 *   * default (zoom ≥ 11) — everything else in the AIRPORTS dataset.
 *
 * The threshold for tier 2 is intentionally LOOSER than the original 7
 * so country-level airports show up when the user is just zooming into
 * a continent, not after a deep zoom into a single country.
 */
const TIER_1_HUBS = new Set([
  // ─── Europe ─────────────────────────────────────────────────────────
  'LHR', 'CDG', 'FRA', 'AMS', 'IST', 'MAD', 'BCN', 'FCO', 'MUC', 'ZRH',
  'VIE', 'CPH', 'OSL', 'ARN', 'HEL', 'WAW', 'PRG', 'BRU', 'DUB', 'ATH',
  'LIS', 'MXP', 'BER',

  // ─── Middle East — capital-level per country ────────────────────────
  'DXB', 'AUH',                      // UAE
  'DOH',                              // Qatar
  'JED', 'RUH',                      // Saudi Arabia
  'TLV',                              // Israel
  'IKA', 'THR',                      // Iran (Imam Khomeini + Mehrabad)
  'BGW',                              // Iraq
  'KWI',                              // Kuwait
  'BAH',                              // Bahrain
  'MCT',                              // Oman
  'SAH',                              // Yemen
  'AMM',                              // Jordan
  'BEY',                              // Lebanon
  'DAM',                              // Syria
  'CYP', 'LCA',                      // Cyprus

  // ─── North Africa — capital + major hub ─────────────────────────────
  'CAI', 'HRG',                      // Egypt
  'CMN', 'RAK',                      // Morocco
  'ALG',                              // Algeria
  'TUN',                              // Tunisia
  'TIP',                              // Libya

  // ─── Sub-Saharan Africa — country capitals ──────────────────────────
  'JNB', 'CPT',                      // South Africa
  'NBO',                              // Kenya
  'ADD',                              // Ethiopia
  'LOS', 'ABV',                      // Nigeria
  'ACC',                              // Ghana
  'DKR',                              // Senegal
  'ABJ',                              // Ivory Coast
  'DAR',                              // Tanzania
  'EBB',                              // Uganda
  'KGL',                              // Rwanda
  'LAD',                              // Angola
  'KRT',                              // Sudan
  'FIH',                              // DR Congo
  'MRU',                              // Mauritius
  'TNR',                              // Madagascar

  // ─── Asia — country-level capitals ─────────────────────────────────
  'HND', 'NRT',                      // Japan
  'PEK', 'PVG',                      // China (north + Shanghai)
  'HKG',                              // Hong Kong
  'TPE',                              // Taiwan
  'ICN',                              // South Korea
  'SIN',                              // Singapore
  'KUL',                              // Malaysia
  'BKK',                              // Thailand
  'CGK',                              // Indonesia
  'MNL',                              // Philippines
  'HAN', 'SGN',                      // Vietnam
  'PNH',                              // Cambodia
  'VTE',                              // Laos
  'RGN',                              // Myanmar
  'DEL', 'BOM',                      // India
  'DAC',                              // Bangladesh
  'KTM',                              // Nepal
  'CMB',                              // Sri Lanka
  'MLE',                              // Maldives
  'KHI', 'ISB', 'LHE',               // Pakistan
  'KBL',                              // Afghanistan
  'TAS',                              // Uzbekistan
  'ALA', 'NQZ',                      // Kazakhstan
  'GYD',                              // Azerbaijan
  'EVN',                              // Armenia
  'TBS',                              // Georgia
  'UBN',                              // Mongolia

  // ─── North America — country / state capital coverage ──────────────
  'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'DEN', 'SFO', 'MIA',
  'ANC',                              // Alaska
  // Canada — provinces + territorial hubs
  'YYZ', 'YUL', 'YVR', 'YYC',        // already-major: Toronto / Montreal / Vancouver / Calgary
  'YOW', 'YEG', 'YHZ', 'YWG',        // Ottawa / Edmonton / Halifax / Winnipeg
  'YQB', 'YZF', 'YFB',                // Quebec / Yellowknife / Iqaluit
  // Greenland — sparse but has at least 4 international-relevant fields
  'GOH', 'SFJ', 'JAV', 'THU',        // Nuuk / Kangerlussuaq / Ilulissat / Thule
  // Mexico — major hubs across the country
  'MEX', 'GDL', 'MTY', 'CUN',        // Mexico City / Guadalajara / Monterrey / Cancun
  'TIJ',                              // Tijuana

  // ─── Caribbean & Central America — capitals ────────────────────────
  'HAV',                              // Cuba
  'SJU',                              // Puerto Rico
  'SDQ',                              // Dominican Republic
  'KIN',                              // Jamaica
  'NAS',                              // Bahamas
  'GUA',                              // Guatemala
  'SAL',                              // El Salvador
  'TGU',                              // Honduras
  'MGA',                              // Nicaragua
  'SJO',                              // Costa Rica
  'PTY',                              // Panama (also a regional super-hub)

  // ─── South America — capital + major hub per country ────────────────
  'GRU', 'GIG', 'BSB',               // Brazil (Sao Paulo + Rio + Brasilia)
  'EZE', 'AEP',                      // Argentina (Ezeiza + Aeroparque)
  'SCL',                              // Chile
  'LIM',                              // Peru
  'BOG',                              // Colombia
  'CCS',                              // Venezuela
  'UIO', 'GYE',                      // Ecuador
  'VVI', 'LPB',                      // Bolivia
  'ASU',                              // Paraguay
  'MVD',                              // Uruguay
  'PBM',                              // Suriname
  'GEO',                              // Guyana
  'CAY',                              // French Guiana

  // ─── Russia — Moscow + far-east + regional spread ──────────────────
  'SVO', 'DME', 'VKO',               // Moscow (3 major airports)
  'LED',                              // St. Petersburg
  'KZN',                              // Kazan
  'AER',                              // Sochi
  'SVX',                              // Yekaterinburg (Urals)
  'OVB',                              // Novosibirsk (Siberia)
  'IKT',                              // Irkutsk (Lake Baikal)
  'VVO', 'KHV',                      // Vladivostok / Khabarovsk (Far East)
  'PKC',                              // Petropavlovsk-Kamchatsky (Kamchatka)
  'UFA',                              // Ufa (Bashkortostan)

  // ─── Oceania ───────────────────────────────────────────────────────
  'SYD', 'MEL', 'AKL',
]);

const TIER_2_REGIONALS = new Set([
  // ─── Europe — secondary hubs ────────────────────────────────────────
  'LGW', 'ORY', 'DUS', 'HAM', 'STR', 'CGN', 'NUE', 'HAJ', 'LEJ',
  'NCE', 'LYS', 'MRS', 'TLS', 'BOD',
  'BGY', 'NAP', 'VCE', 'BLQ',
  'GVA', 'BSL', 'PMI', 'AGP', 'IBZ', 'TFS', 'LPA',
  'EDI', 'MAN', 'BHX',
  'OPO', 'FAO', 'SKG', 'SOF', 'OTP', 'BUD', 'KRK', 'BEG', 'ZAG',
  'SAW', 'AYT', 'ADB', 'ESB',
  'RIX', 'VNO', 'TLL',

  // ─── Middle East — second + third hubs per country ──────────────────
  'SHJ', 'RKT',                      // UAE (alongside DXB/AUH)
  'DMM', 'MED',                      // Saudi (alongside JED/RUH)
  'ETM', 'HFA',                      // Israel
  'MHD', 'SYZ', 'ISF',               // Iran
  'BSR', 'EBL',                      // Iraq
  'SLL',                              // Oman
  'ADE',                              // Yemen
  'AQJ',                              // Jordan
  'ALP', 'LTK',                      // Syria
  'PFO',                              // Cyprus

  // ─── North Africa — second + third hubs per country ─────────────────
  'SSH', 'LXR', 'ASW',               // Egypt
  'AGA', 'FEZ', 'RBA', 'TNG',        // Morocco
  'ORN', 'CZL',                      // Algeria
  'NBE', 'MIR', 'DJE',               // Tunisia
  'BEN', 'MJI',                      // Libya

  // ─── Sub-Saharan Africa — at least one per country ──────────────────
  'JRO', 'ZNZ',                      // Tanzania (alongside DAR)
  'MBA',                              // Kenya
  'DSS',                              // Senegal (Diass)
  'DLA', 'NSI',                      // Cameroon
  'VFA', 'HRE',                      // Zimbabwe
  'GBE',                              // Botswana
  'WDH',                              // Namibia
  'MPM',                              // Mozambique
  'LUN',                              // Zambia
  'BZV',                              // Congo Brazzaville
  'LBV',                              // Gabon
  'SSG',                              // Equatorial Guinea
  'JUB',                              // South Sudan
  'ASM',                              // Eritrea
  'JIB',                              // Djibouti
  'MGQ',                              // Somalia
  'BKO',                              // Mali
  'OUA',                              // Burkina Faso
  'NIM',                              // Niger
  'NDJ',                              // Chad
  'ROB',                              // Liberia
  'FNA',                              // Sierra Leone
  'CKY',                              // Guinea
  'NKC',                              // Mauritania
  'COO',                              // Benin
  'LFW',                              // Togo
  'RAI',                              // Cape Verde
  'SEZ',                              // Seychelles

  // ─── Asia — secondary regionals ─────────────────────────────────────
  'KIX', 'NGO', 'FUK',               // Japan
  'SHA', 'SZX', 'CTU', 'CKG',        // China
  'GMP',                              // Korea
  'CEB', 'DVO',                      // Philippines
  'SUB', 'UPG',                      // Indonesia
  'DAD',                              // Vietnam
  'REP',                              // Cambodia
  'MDL',                              // Myanmar
  'CGP',                              // Bangladesh
  'PBH',                              // Bhutan
  'BLR', 'MAA', 'HYD', 'CCU',        // India
  'BWN',                              // Brunei
  'ASB',                              // Turkmenistan
  'DYU',                              // Tajikistan
  'FRU',                              // Kyrgyzstan

  // ─── USA — additional regional hubs ─────────────────────────────────
  'EWR', 'IAH', 'SEA', 'BOS', 'CLT', 'MSP', 'DTW', 'MCO', 'LAS', 'PHX',
  'PHL', 'BWI', 'DCA', 'IAD', 'TPA', 'FLL', 'SLC', 'SAN', 'PDX', 'MCI',
  'BNA', 'AUS', 'STL', 'PIT', 'IND', 'CMH', 'CLE', 'MEM',
  'FAI', 'JNU',                      // Alaska secondaries

  // ─── Canada — secondary cities ──────────────────────────────────────
  'YQR', 'YXE', 'YYJ', 'YXX', 'YHM',  // Regina / Saskatoon / Victoria / Abbotsford / Hamilton
  'YQM', 'YYT', 'YQT', 'YXY',        // Moncton / St John's / Thunder Bay / Whitehorse

  // ─── Greenland & Arctic — small fields kept at tier-2 ───────────────
  'JEG', 'UAK',                      // Aasiaat / Narsarsuaq

  // ─── Mexico — touristic + regional ─────────────────────────────────
  'PVR', 'SJD', 'MID', 'OAX', 'BJX', 'CJS', 'CUL',
  // Puerto Vallarta / San Jose del Cabo / Merida / Oaxaca / Bajio /
  // Ciudad Juarez / Culiacan

  // ─── Caribbean & Central America — second hubs ──────────────────────
  'POP',                              // Puerto Plata (Dominican)
  'MBJ',                              // Montego Bay (Jamaica)
  'AUA',                              // Aruba
  'CUR',                              // Curacao
  'BGI',                              // Barbados
  'POS',                              // Trinidad
  'BZE',                              // Belize
  'GCM',                              // Cayman

  // ─── South America — secondaries per country ────────────────────────
  'CNF', 'SSA', 'REC', 'FOR', 'POA', 'CWB', 'MAO', 'VCP', 'BEL',
  // Brazil: Belo Horizonte / Salvador / Recife / Fortaleza / Porto Alegre /
  // Curitiba / Manaus / Campinas / Belem
  'COR', 'MDZ', 'BRC', 'USH',        // Argentina: Cordoba / Mendoza / Bariloche / Ushuaia
  'ARI', 'IPC', 'PMC', 'CCP',        // Chile: Arica / Easter Island / Puerto Montt / Concepcion
  'CUZ', 'AQP', 'IQT',                // Peru: Cusco / Arequipa / Iquitos
  'MDE', 'CTG', 'CLO', 'BAQ',        // Colombia: Medellin / Cartagena / Cali / Barranquilla
  'MAR', 'VLN',                      // Venezuela: Maracaibo / Valencia
  'CUE',                              // Ecuador: Cuenca
  'CIJ',                              // Bolivia: Cobija (also: SRZ Santa Cruz Vieja)
  'AXM', 'PEI',                      // Colombia tourist: Armenia / Pereira

  // ─── Russia — wider regional coverage ──────────────────────────────
  'KUF',                              // Samara
  'ROV', 'KRR',                      // Rostov / Krasnodar (south)
  'MRV',                              // Mineralnye Vody (Caucasus)
  'KJA',                              // Krasnoyarsk
  'BAX',                              // Barnaul
  'OMS',                              // Omsk
  'TJM',                              // Tyumen
  'SGC',                              // Surgut
  'YKS',                              // Yakutsk
  'GDX',                              // Magadan
  'UUS',                              // Yuzhno-Sakhalinsk
  'MMK',                              // Murmansk
  'ARH',                              // Arkhangelsk
  'KGD',                              // Kaliningrad
  'VOG',                              // Volgograd
  'CEK',                              // Chelyabinsk
  'PEE',                              // Perm
  'NJC',                              // Nizhnevartovsk

  // ─── Oceania ───────────────────────────────────────────────────────
  'BNE', 'PER', 'ADL', 'OOL', 'CNS',  // Brisbane / Perth / Adelaide / Gold Coast / Cairns
  'ZQN', 'CHC', 'WLG',                // NZ: Queenstown / Christchurch / Wellington
  'NOU',                              // New Caledonia
  'PPT',                              // Tahiti
  'NAN', 'SUV',                      // Fiji: Nadi / Suva
  'APW',                              // Samoa
  'TBU',                              // Tonga
  'POM',                              // Papua New Guinea
]);

/**
 * Classify an IATA code into a min-zoom threshold.
 * Hot path during render — keep cheap (set lookups, no allocations).
 */
function tierMinZoom(iata: string): number {
  if (TIER_1_HUBS.has(iata)) return 4;
  if (TIER_2_REGIONALS.has(iata)) return 6;
  return 11;
}

interface AirportEntry {
  iata: string;
  lat: number;
  lon: number;
  minZoom: number;
}

/**
 * Cache of pre-computed airport entries with their min-zoom thresholds.
 * Invalidates when the underlying AIRPORTS dictionary grows — that
 * happens exactly once when {@link loadAirports} resolves on the client,
 * so this is a single transition from "empty cache" → "full cache".
 *
 * Also pre-sorts entries so tier-1 airports come first. With label cap
 * `maxLabels` reached before a tier-1 hub gets considered, the user
 * would see European airports but no Cairo / Tel Aviv / Tehran. Sorting
 * pinned tiers ensures the cap never starves the high-priority set.
 */
let _airportCache: AirportEntry[] | null = null;
let _airportCacheSize = -1;

function getAirportEntries(): AirportEntry[] {
  const liveSize = Object.keys(AIRPORTS).length;
  if (_airportCache && liveSize === _airportCacheSize) return _airportCache;

  const entries: AirportEntry[] = [];
  for (const [iata, data] of Object.entries(AIRPORTS) as [string, { la: number; lo: number }][]) {
    entries.push({
      iata,
      lat: data.la,
      lon: data.lo,
      minZoom: tierMinZoom(iata),
    });
  }
  // Tier-1 first, then tier-2, then default. Stable insertion order
  // within each tier (no secondary sort needed).
  entries.sort((a, b) => a.minZoom - b.minZoom);

  _airportCache = entries;
  _airportCacheSize = liveSize;
  return entries;
}

export function useAirportLabels({
  mapRef,
  mapStyle,
  zoom,
  weatherEnabled = true,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  mapStyle: MapStyle;
  zoom: number;
  /** When true, prefetch weather for visible airports and append a
   *  weather emoji to each label. When false, never touches the
   *  Open-Meteo proxy and labels stay text-only. */
  weatherEnabled?: boolean;
}) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Subscribe to the weather cache so labels re-render once the first
  // batch of fetches lands. Without this the icons never appear until
  // the user pans / zooms (which re-runs the effect for unrelated reasons).
  const weatherTick = useWeatherCacheTick();

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!map.hasLayer(layer)) layer.addTo(map);

    if (zoom < 4) return;

    // Pad the bounds by 10 % of the visible span so airports JUST outside
    // the viewport still get rendered. Without this, a city like Tunis
    // (TUN) at the very-top of a Tunisia-centric pan can have its dot
    // visible but label clipped, OR vice-versa: dot offscreen but the
    // label that would extend INTO the screen is suppressed because the
    // dot's lat/lon failed the strict inside-bounds test.
    //
    // 10 % is a sweet spot — wide enough to cover a label that pokes
    // ~50 px into the viewport at average zoom, narrow enough that a
    // sibling country's airports don't flood in.
    const rawBounds = map.getBounds();
    const latPad = (rawBounds.getNorth() - rawBounds.getSouth()) * 0.10;
    const lonPad = (rawBounds.getEast()  - rawBounds.getWest())  * 0.10;
    const south = rawBounds.getSouth() - latPad;
    const north = rawBounds.getNorth() + latPad;
    const west  = rawBounds.getWest()  - lonPad;
    const east  = rawBounds.getEast()  + lonPad;

    const isDark = mapStyle === 'dark' || mapStyle === 'night';
    const labelColor = isDark ? '#94B8C8' : '#0F172A';
    const dotColor = isDark ? '#5A7B9A' : '#334155';
    const textShadow = isDark ? '0 0 4px rgba(0,0,0,0.9)' : '0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.6)';

    // Cap labels per zoom tier so the screen doesn't choke on dense
    // regions. With the tier-sorted iteration above we KEEP the cap but
    // never starve the high-priority set: tier-1 hubs are processed
    // first, so whatever remains of the cap goes to tier-2 / tier-3.
    //
    // The numbers are tuned empirically: a continent-zoom 5 view shows
    // ~80 tier-1 hubs world-wide, of which 20–40 are usually in bounds.
    // 100 leaves head-room for tier-2 country airports ME/NA the user
    // requested without flooding city-level zoom 8+ where the cap rises.
    const maxLabels = zoom < 7 ? 100 : zoom < 9 ? 180 : 280;
    let count = 0;

    for (const apt of getAirportEntries()) {
      if (count >= maxLabels) break;
      if (zoom < apt.minZoom) continue;
      if (apt.lat < south || apt.lat > north || apt.lon < west || apt.lon > east) continue;

      count++;

      const dot = L.circleMarker([apt.lat, apt.lon], {
        radius: zoom >= 9 ? 3 : 2,
        color: 'transparent',
        fillColor: dotColor,
        fillOpacity: 0.5,
        weight: 0,
        interactive: false,
      });

      const fontSize = zoom >= 9 ? 10 : zoom >= 7 ? 9 : 8;

      // Optional weather emoji — looked up from the module-scope cache
      // and prefetched fire-and-forget so the next pan / zoom or the
      // weatherTick subscription re-renders the label with the icon.
      // Emoji renders at the same size as the IATA text so the row
      // stays vertically aligned regardless of which icon comes back.
      let weatherSpan = '';
      if (weatherEnabled) {
        prefetchAirportWeather(apt.iata, apt.lat, apt.lon, true);
        const w = getCachedWeather(apt.iata);
        if (w && w.code != null) {
          const emoji = getWeatherEmoji(w.code, w.isDay);
          weatherSpan = `<span style="font-size:${fontSize + 2}px;margin-left:3px;vertical-align:middle;">${emoji}</span>`;
        }
      }

      // direction:'auto' lets Leaflet pick left/right/top/bottom based on
      // which side has room — at the right edge of the viewport the label
      // flips to 'left' instead of getting clipped, fixing the "dot but
      // no label visible" bug for edge-aligned hubs (TUN at the top-right
      // of a Tunisia view was the canonical reproducer).
      dot.bindTooltip(
        L.tooltip({
          permanent: true,
          direction: 'auto',
          offset: [5, 0],
          className: 'airport-label',
        }).setContent(
          `<span style="font-family:var(--font-heading);font-size:${fontSize}px;font-weight:700;letter-spacing:0.8px;color:${labelColor};text-shadow:${textShadow};pointer-events:none;">${apt.iata}${weatherSpan}</span>`
        )
      );
      dot.addTo(layer);
    }
    // weatherTick is in the deps so the effect re-runs when a freshly-
    // fetched weather code lands. weatherEnabled gates the prefetch
    // path; toggling it off won't tear down already-rendered icons
    // until the next pan/zoom, which is acceptable for a settings
    // change (labels are cheap to recompute on the next interaction).
  }, [mapRef, mapStyle, zoom, weatherEnabled, weatherTick]);

  return layerRef;
}
