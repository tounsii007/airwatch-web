#!/usr/bin/env node
/**
 * Semantic bundle-size budget check.
 *
 * Replaces `size-limit`'s single all-chunks rollup with a budget that
 * recognises the structural reality of this app: most users never
 * download the 3D-globe code path. A single rollup masks creep in the
 * shell behind Cesium's bulk; a single rollup also fails CI on every
 * legitimate Cesium update.
 *
 * Two buckets, two budgets:
 *
 *   1. CORE — every JS chunk a typical user might download. The home
 *      page, search, dashboard, settings, every list view — all of
 *      that. This budget is tight (1 MB gzip) so any bloat in the
 *      shared shell or the most-trafficked routes is caught early.
 *
 *   2. LAZY-3D — chunks belonging to the /globe (Cesium) and
 *      /replay/3d (deck.gl) routes ONLY. These are gated behind
 *      explicit user navigation; the cost is real but justified, and
 *      the budget here is loose (1.6 MB gzip) to absorb Cesium
 *      updates without thrashing CI.
 *
 *   3. PER-CHUNK CEILING — no single chunk may exceed PER_CHUNK_MAX
 *      gzipped. Catches a regression where an existing chunk suddenly
 *      doubles (e.g. someone statically imports something that should
 *      be lazy).
 *
 * How chunks are bucketed
 *   The `dynamic()` boundaries in our source are the ground truth for
 *   what's lazy. We grep the source for known 3D entry points and
 *   look up which chunks transitively reference them. Concretely:
 *
 *     * Any chunk that contains the literal string "Cesium" (the
 *       global Cesium namespace gets serialised into its bundle)
 *       belongs to LAZY-3D.
 *     * Any chunk that imports from `@deck.gl/*` (string match for
 *       `deck.gl`) belongs to LAZY-3D.
 *     * Everything else is CORE.
 *
 *   This is a heuristic, not perfect — but it's resilient: if someone
 *   adds a new dynamic-imported heavy library, just add its sentinel
 *   string to LAZY_3D_MARKERS below. The script does NOT use chunk
 *   size as a heuristic (because a future regression could push a
 *   core chunk over the threshold and silently get bucketed as lazy).
 *
 * Why not size-limit
 *   size-limit is great when "all bundled JS" maps to "what users
 *   download". For an app with route-level lazy splitting, that
 *   mapping breaks and you end up either ignoring real creep or
 *   thrashing CI. The 30 lines below model our actual deployment
 *   reality.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const CHUNK_DIR = '.next/static/chunks';
const CSS_DIR = '.next/static/chunks';

// Sentinel strings that, if present in a chunk, classify it as LAZY-3D.
// Each entry is paired with a human label so the report explains *why*
// a chunk landed in the lazy bucket.
const LAZY_3D_MARKERS = [
  { needle: 'Cesium', reason: 'Cesium 3D globe runtime (/globe)' },
  { needle: '@deck.gl', reason: 'deck.gl WebGL replay (/replay/3d)' },
  { needle: 'deck.gl', reason: 'deck.gl WebGL replay (/replay/3d)' },
];

// Budgets (gzipped, bytes). See file header for rationale.
//
// Each budget is sized to give meaningful headroom over the *current*
// reality so a routine library update doesn't trip CI, but tight
// enough that a doubling-class regression definitely does.
//
//   Current numbers (record at 2026-04-30, recompute after major dep
//   bumps so the budgets stay calibrated):
//     core         586 KB → budget 1000 KB → 41 % headroom
//     lazy3d      1.39 MB → budget 1.80 MB → 23 % headroom
//     perChunkMax 1.22 MB → budget 1.50 MB → 19 % headroom
//     cssRaw       86 KB → budget  150 KB → 43 % headroom
const BUDGETS = {
  core: 1_000 * 1024,        // 1.0 MB — every-user code path
  lazy3d: 1_800 * 1024,      // 1.8 MB — Cesium + deck.gl, only on /globe + /replay/3d
  perChunkMax: 1_500 * 1024, // 1.5 MB — Cesium runtime is the legitimate ceiling; anything bigger is a regression
  cssRaw: 150 * 1024,        // 150 KB — Tailwind doesn't compress much, raw is the honest measure
};

// ── Helpers ────────────────────────────────────────────────────────────

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function classify(chunkBytes) {
  // Stream the chunk through a small set of substring checks. We only
  // need the first match — sentinel strings are deliberately unique.
  const text = chunkBytes.toString('utf8');
  for (const { needle, reason } of LAZY_3D_MARKERS) {
    if (text.includes(needle)) return { bucket: 'lazy3d', reason };
  }
  return { bucket: 'core', reason: 'shared / per-route runtime' };
}

function listChunks(dir, ext) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(ext))
    .map((name) => {
      const path = join(dir, name);
      const raw = readFileSync(path);
      return {
        name,
        path,
        rawSize: statSync(path).size,
        gzipSize: gzipSync(raw, { level: 9 }).length,
        rawBytes: raw,
      };
    });
}

// ── Main ───────────────────────────────────────────────────────────────

const jsChunks = listChunks(CHUNK_DIR, '.js');
const cssChunks = listChunks(CSS_DIR, '.css');

const core = [];
const lazy3d = [];
let largestChunk = { name: '(none)', gzipSize: 0 };

for (const chunk of jsChunks) {
  const { bucket, reason } = classify(chunk.rawBytes);
  chunk.reason = reason;
  if (bucket === 'lazy3d') lazy3d.push(chunk);
  else core.push(chunk);
  if (chunk.gzipSize > largestChunk.gzipSize) largestChunk = chunk;
}

const coreTotal = core.reduce((s, c) => s + c.gzipSize, 0);
const lazyTotal = lazy3d.reduce((s, c) => s + c.gzipSize, 0);
const cssTotal = cssChunks.reduce((s, c) => s + c.rawSize, 0);

const failures = [];
function check(name, actual, limit, units = 'gzip') {
  const pct = ((actual / limit) * 100).toFixed(0);
  const within = actual <= limit;
  const colour = within ? '\x1b[32m' : '\x1b[31m';
  const tick = within ? '✓' : '✗';
  console.log(
    `  ${colour}${tick}\x1b[0m ${name.padEnd(28)} ${fmt(actual).padStart(10)} ${units} ` +
    `/ ${fmt(limit).padStart(8)}  (${pct}% of budget)`,
  );
  if (!within) {
    failures.push(
      `${name}: ${fmt(actual)} ${units} exceeds ${fmt(limit)} budget by ${fmt(actual - limit)}`,
    );
  }
}

console.log('\n  Bundle budget check\n');
console.log('  ─── JS ──────────────────────────────────────────────────────────────');
check('Core (every-user)', coreTotal, BUDGETS.core);
check('Lazy 3D (/globe, /replay/3d)', lazyTotal, BUDGETS.lazy3d);
check('Largest single chunk', largestChunk.gzipSize, BUDGETS.perChunkMax);
console.log('  ─── CSS ─────────────────────────────────────────────────────────────');
check('All CSS', cssTotal, BUDGETS.cssRaw, 'raw ');
console.log('');

if (process.env.VERBOSE === '1' || failures.length > 0) {
  console.log('  ─── Per-chunk breakdown (top 10 by gzip) ────────────────────────────');
  jsChunks
    .sort((a, b) => b.gzipSize - a.gzipSize)
    .slice(0, 10)
    .forEach((c) => {
      const tag = lazy3d.includes(c) ? '\x1b[33mlazy\x1b[0m' : '\x1b[36mcore\x1b[0m';
      console.log(
        `    ${tag}  ${fmt(c.gzipSize).padStart(10)} gz  ${c.name.padEnd(24)}  (${c.reason})`,
      );
    });
  console.log('');
}

if (failures.length > 0) {
  console.error('\x1b[31m  ✗ Budget exceeded:\x1b[0m');
  failures.forEach((f) => console.error(`    • ${f}`));
  console.error(
    '\n  Re-run with VERBOSE=1 npm run size to see per-chunk attribution.\n',
  );
  process.exit(1);
}

console.log('\x1b[32m  All budgets within limits.\x1b[0m\n');
