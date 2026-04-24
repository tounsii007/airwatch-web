#!/usr/bin/env node
/**
 * build-city-i18n.mjs
 *
 * Extracts a compact client-consumable JSON with localized city names
 * (en / de / fr only — the three locales this app ships with) from the
 * upstream GeoNames dump at `C:/projects/world_cities_i18n.json` (≈12 MB).
 *
 * <h2>Coverage strategy</h2>
 *
 * The upstream dataset has several failure modes this script defends against:
 * <ul>
 *   <li>Some big cities are indexed under slang / historical names:
 *       {@code names.en = "The Big Apple"} (New York),
 *       {@code names.fr = "Pantruche"} (Paris),
 *       {@code names.de = "Konstantinopel"} (Istanbul). We check
 *       {@code names.local} as a secondary key and blacklist known slang.</li>
 *   <li>Small-town homonyms often outrank metropoles by dataset order (e.g.
 *       a 34k-pop "Los Angeles" comes before the 3.8M metro). Population is
 *       the tie-breaker; we keep the largest entry per normalised name.</li>
 *   <li>Many airport-adjacent cities have identical en/de/fr spellings
 *       (Singapore, Dubai, Miami). We still emit them when they match an
 *       airport-city AND have ≥200 k population — this lets the reverse-lookup
 *       path still resolve them, even though the display is identical across
 *       locales.</li>
 *   <li>Metadata noise in the source like
 *       {@code "Amsterdam (New York, USA)"} is stripped — anything containing
 *       a parenthesised qualifier is treated as not-a-translation.</li>
 * </ul>
 *
 * Output: public/data/city-i18n.json
 * Run:    npm run build:city-i18n
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Paths ────────────────────────────────────────────────────────────────────
const SOURCE_FILE   = 'C:/projects/world_cities_i18n.json';
const AIRPORTS_FILE = resolve('public', 'data', 'airports.json');
const OUTPUT_FILE   = resolve('public', 'data', 'city-i18n.json');

// Lowered from 500 k to 200 k: this pulls in dozens of medium-sized cities
// whose names differ between locales (e.g. Stuttgart, Hamburg variants, Lille)
// without bloating the output past 70 KB.
const POPULATION_FLOOR = 200_000;

// Slang / historical / metadata labels upstream marks as *translations* but
// that we absolutely do not want in the UI. If any of en/de/fr matches one of
// these exactly, we throw the whole variant away and fall back to the canonical
// English name (i.e. we refuse to "translate" with it).
const NAME_BLACKLIST = new Set([
  // Slang / nicknames masquerading as canonical English names in the upstream.
  'The Big Apple',          // NYC
  'The City of Angels',     // Bangkok (also used for LA!)
  'Pantruche',              // Paris (fr slang)
  'Temasek',                // Singapore (historical)
  'Sunda Kelapa',           // Jakarta (historical)
  'Bombay',                 // Mumbai (old name — UN-renamed 1995)
  'Peking',                 // Beijing (we want pinyin)
  'Jo\'anna',               // Johannesburg (slang)
  'Edo', 'Yedo',            // Tokyo (historical)
  'Saigon',                 // Ho Chi Minh City (historical; we want the modern name)
  'Leningrad',              // Saint Petersburg (Soviet era)
  'Stalingrad',             // Volgograd (Soviet era)
  // Historical / cross-era names we never want in modern UI:
  'Konstantinopel', 'Byzantium',
  // Common upstream admin-suffix patterns — if en == these we reject.
  'Seoul-si',
  'Dubai City',
  'Manila City',
  'Tel Aviv Yaffo',
  // "-si", "-shi", "-ku" Korean/Japanese admin suffixes are handled by cleanName below.
]);

// True if a name ends with an administrative suffix that makes it "official
// English" but unfriendly to display — we prefer the unsuffixed local form.
function hasAdminSuffix(name) {
  return /\b(-si|-shi|-ku|-gun|City)$/i.test(name.trim());
}

function looksLikeMetadata(name) {
  return typeof name === 'string' && /\([^)]+\)/.test(name);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function normalize(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanName(name) {
  if (!name) return null;
  if (NAME_BLACKLIST.has(name)) return null;
  if (looksLikeMetadata(name)) return null;
  if (hasAdminSuffix(name))    return null;
  return name.trim();
}

// Pick a canonical English label from an entry. Subtle but crucial: when a
// blacklisted or admin-suffixed `en` is present, we fall back to `local`
// because that's where upstream stores the real-world city name for most
// Asian / Middle-Eastern / African entries. Only as a last resort do we
// borrow a Romance-language spelling.
function pickCanonicalEn(names) {
  const candidates = [names.en, names.local, names.fr, names.de, names.es, names.it, names.pt];
  for (const c of candidates) {
    const clean = cleanName(c);
    if (clean) return clean;
  }
  return null;
}

// ── Load inputs ──────────────────────────────────────────────────────────────
if (!existsSync(SOURCE_FILE)) {
  console.error(`❌ Source file not found: ${SOURCE_FILE}`);
  process.exit(1);
}
if (!existsSync(AIRPORTS_FILE)) {
  console.error(`❌ Airports file not found: ${AIRPORTS_FILE}`);
  process.exit(1);
}

console.log(`📖 Reading ${SOURCE_FILE} …`);
const source = JSON.parse(readFileSync(SOURCE_FILE, 'utf-8'));
console.log(`   → ${source.length.toLocaleString()} city entries`);

console.log(`📖 Reading ${AIRPORTS_FILE} …`);
const airports = JSON.parse(readFileSync(AIRPORTS_FILE, 'utf-8'));

const airportCityNames = new Set();
for (const record of Object.values(airports)) {
  if (record?.n) airportCityNames.add(normalize(record.n));
}
console.log(`   → ${airportCityNames.size.toLocaleString()} unique airport-city names`);

// ── Build the output table ───────────────────────────────────────────────────
// Key = normalised canonical English name; value = { en, de?, fr?, _pop }
// _pop is a private sort key, stripped before output.
const output = {};
let kept = 0, skippedIrrelevant = 0, skippedNoClean = 0;

for (const entry of source) {
  const names = entry?.names;
  if (!names) continue;

  const en = pickCanonicalEn(names);
  if (!en) { skippedNoClean++; continue; }

  const key = normalize(en);
  const pop = entry.population ?? 0;

  // Relevance gate — keep only cities that either match a known airport
  // OR are large enough to be queried by non-airport searches.
  const isAirportCity = airportCityNames.has(key);
  const isLargeCity   = pop >= POPULATION_FLOOR;
  if (!isAirportCity && !isLargeCity) { skippedIrrelevant++; continue; }

  const de = cleanName(names.de);
  const fr = cleanName(names.fr);

  // Build the entry. Even if de/fr match en, we still emit — lookups are
  // idempotent in that case and we get the reverse-index coverage for
  // "typing the English name in German mode still resolves".
  const next = {
    en,
    ...(de ? { de } : {}),
    ...(fr ? { fr } : {}),
    _pop: pop,
  };

  const prev = output[key];
  if (prev && prev._pop >= pop) continue;   // keep the biggest homonym
  output[key] = next;
  if (!prev) kept++;
}

// Strip _pop before writing.
for (const k of Object.keys(output)) delete output[k]._pop;

// ── Write ────────────────────────────────────────────────────────────────────
writeFileSync(OUTPUT_FILE, JSON.stringify(output));
const size = statSync(OUTPUT_FILE).size;

console.log(``);
console.log(`✅ Wrote ${Object.keys(output).length.toLocaleString()} cities`);
console.log(`   → ${OUTPUT_FILE}`);
console.log(`   → ${(size / 1024).toFixed(1)} KB`);
console.log(``);
console.log(`📊 Stats:`);
console.log(`   kept:                 ${kept.toLocaleString()}`);
console.log(`   skipped (no clean en):${skippedNoClean.toLocaleString()}`);
console.log(`   skipped (irrelevant): ${skippedIrrelevant.toLocaleString()}`);
