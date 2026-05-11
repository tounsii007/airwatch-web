#!/usr/bin/env node
/**
 * Bundle-size budget check for CI. (Phase 4)
 *
 * Scans `.next/static/chunks/` after a production build and asserts
 * that the total size of admin-route chunks stays under a configured
 * budget. Exits non-zero on overspend so CI can gate merges.
 *
 * Why a custom script vs `@next/bundle-analyzer`:
 *   * The analyzer is an interactive HTML report — great for humans,
 *     useless for CI (no exit code, no diff against a budget).
 *   * Lighthouse CI works on rendered pages and needs a running server
 *     — much heavier than what we want for a "did the bundle grow"
 *     pre-merge check.
 *   * Reading the static asset directory directly is what the size
 *     limits in CI/CD docs all do under the hood; we lose nothing by
 *     skipping the indirection.
 *
 * Budgets (rationale):
 *   admin-total-bytes:     gzipped sum of every chunk loaded by any
 *                          admin route. Catches "admin module is
 *                          getting too big" regressions.
 *   admin-page-max-bytes:  per-route worst case. Catches a single
 *                          page (e.g. AlertsPanel) bloating without
 *                          moving the total much.
 *
 * Run: `npm run perf:check` (after `npm run build`).
 *
 * Usage:
 *   --max-total <bytes>   override admin-total budget
 *   --max-page  <bytes>   override per-page budget
 *   --json                emit machine-readable JSON for CI dashboards
 *   --quiet               suppress per-file detail
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
const MAX_TOTAL = parseInt(arg('--max-total', '5500000'), 10); // 5.5 MB gzipped
const MAX_PAGE  = parseInt(arg('--max-page',  '1500000'), 10); // 1.5 MB per route gzipped
const JSON_OUT  = args.includes('--json');
const QUIET     = args.includes('--quiet');

const BUILD_DIR   = join(process.cwd(), '.next');
const STATIC_DIR  = join(BUILD_DIR, 'static');
const STATS_FILE  = join(BUILD_DIR, 'diagnostics', 'route-bundle-stats.json');

if (!existsSync(BUILD_DIR) || !existsSync(STATIC_DIR) || !existsSync(STATS_FILE)) {
  console.error('No .next/diagnostics/route-bundle-stats.json — run `npm run build` first.');
  process.exit(2);
}

/**
 * Compute gzipped size — that's what the browser actually downloads.
 * Comparing raw bytes makes the budget too easy to game (a file full
 * of repeated whitespace is small over the wire but raw-large).
 */
function gzipBytes(absPath) {
  return gzipSync(readFileSync(absPath)).length;
}

/** Format byte count with KB / MB suffix. */
function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Next.js 16 emits a structured per-route bundle report at
 * .next/diagnostics/route-bundle-stats.json. Each entry lists the
 * exact chunk paths a request to that route loads first; that's the
 * authoritative source for "what does this page weigh" — much more
 * accurate than walking chunk filenames by pattern (Next.js 16
 * chunks are content-addressed gibberish).
 */
const stats = JSON.parse(readFileSync(STATS_FILE, 'utf8'));

/** True for routes under the admin section. We treat /admin/* as the scope. */
function isAdminRoute(route) {
  return route === '/admin' || route.startsWith('/admin/');
}

const sizeCache = new Map();
function gzCached(absPath) {
  if (sizeCache.has(absPath)) return sizeCache.get(absPath);
  if (!existsSync(absPath)) return 0;
  const n = gzipBytes(absPath);
  sizeCache.set(absPath, n);
  return n;
}

const perRoute = new Map();
const adminChunks = new Set();
let totalAdminGz = 0;

for (const entry of stats) {
  if (!isAdminRoute(entry.route)) continue;
  // Normalise Windows backslashes coming out of the stats file.
  const chunkAbs = (entry.firstLoadChunkPaths ?? [])
    .map(p => join(process.cwd(), p.split('\\').join(sep)));
  let routeGz = 0;
  for (const c of chunkAbs) {
    routeGz += gzCached(c);
    adminChunks.add(c);
  }
  perRoute.set(entry.route, { gz: routeGz, fileCount: chunkAbs.length });
}
// Total = sum over the union of distinct chunks across every admin
// route. Per-route sizes do double-count the shared shell — that's
// the right framing for "what does ONE admin tab download" — but the
// total budget is about cumulative footprint, so we de-dup.
for (const c of adminChunks) totalAdminGz += gzCached(c);

const sorted = [...perRoute.entries()].sort((a, b) => b[1].gz - a[1].gz);
const overSize = sorted.filter(([, slot]) => slot.gz > MAX_PAGE);
const overTotal = totalAdminGz > MAX_TOTAL;

const summary = {
  totalAdminGz,
  totalAdminBudget: MAX_TOTAL,
  totalAdminBudgetUsedPct: Math.round((totalAdminGz / MAX_TOTAL) * 100),
  perPageBudget: MAX_PAGE,
  routes: sorted.map(([key, slot]) => ({
    key,
    gz: slot.gz,
    overBudget: slot.gz > MAX_PAGE,
    fileCount: slot.fileCount,
  })),
};

if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('\nAdmin bundle budget check (gzipped sizes)\n');
  if (!QUIET) {
    console.log(`  ${'Route'.padEnd(30)} ${'Size'.padStart(10)}  Budget`);
    for (const [key, slot] of sorted) {
      const flag = slot.gz > MAX_PAGE ? ' OVER' : '';
      console.log(`  ${key.padEnd(30)} ${fmt(slot.gz).padStart(10)}  ${fmt(MAX_PAGE)}${flag}`);
    }
    console.log();
  }
  console.log(`  Total admin: ${fmt(totalAdminGz)} / ${fmt(MAX_TOTAL)} (${summary.totalAdminBudgetUsedPct}%)`);
}

if (overSize.length > 0) {
  console.error(`\n  ✗ ${overSize.length} route${overSize.length === 1 ? '' : 's'} over per-page budget (${fmt(MAX_PAGE)}):`);
  for (const [key, slot] of overSize) {
    console.error(`     - ${key}: ${fmt(slot.gz)}`);
  }
}

if (overTotal) {
  console.error(`\n  ✗ Admin total ${fmt(totalAdminGz)} exceeds budget ${fmt(MAX_TOTAL)}`);
}

if (overSize.length > 0 || overTotal) {
  console.error('\nFAILED — bump budgets in scripts/check-perf-budget.mjs only after a deliberate review.\n');
  process.exit(1);
}
console.log('\n  OK — under budget.\n');
