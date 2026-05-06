#!/usr/bin/env node
/**
 * i18n coverage scanner for the admin shell. (Phase 3)
 *
 * Walks every TSX/JSX file under `src/app/(admin)/admin/**` and looks
 * for hardcoded English strings in places that should be translated:
 *
 *   - JSX text content:       `<h1>Settings</h1>`
 *   - JSX attribute values:   `<button title="Refresh">`
 *   - String literals passed as props that look user-visible:
 *     `label="Total calls"`, `placeholder="Search…"`
 *
 * Heuristics:
 *   * Multi-word capitalised strings or sentences are flagged
 *   * Single-word UI tokens are flagged when they sit in a known
 *     "user-visible" prop name (label, title, placeholder, hint, …)
 *   * String literals that look like CSS, paths, dates, or ids are
 *     skipped
 *
 * Output:
 *   STDOUT — table of (file, line, snippet) for every flagged string
 *   Exit code — 0 if all flagged strings are below `--max` (default 0,
 *   strict). CI invokes `npm run i18n:check`.
 *
 * Usage:
 *   node scripts/check-i18n-coverage.mjs              # strict (fail on any)
 *   node scripts/check-i18n-coverage.mjs --max 50    # tolerate ≤ 50 misses
 *   node scripts/check-i18n-coverage.mjs --json      # machine-readable
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src/app/(admin)/admin', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const args = process.argv.slice(2);
const max = (() => {
  const i = args.indexOf('--max');
  if (i < 0) return 0;
  return parseInt(args[i + 1] ?? '0', 10);
})();
const asJson = args.includes('--json');

/** Walk a directory recursively and emit .tsx / .ts files. */
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) yield* walk(path);
    else if (/\.(tsx|jsx|ts)$/.test(name) && !/\.test\./.test(name) && !/\.d\.ts$/.test(name)) yield path;
  }
}

/**
 * Patterns that look like user-visible strings worth translating.
 * Tuned to surface real misses without flooding on file paths, CSS,
 * dates, ids, etc. Multi-word + initial capital is the strongest signal.
 */
const USER_VISIBLE_PROP_NAMES = [
  'label', 'title', 'placeholder', 'hint',
  'subtitle', 'tooltip', 'caption',
  'header', 'description', 'message',
  'aria-label',
];

/** Lines / snippets we explicitly NEVER consider user-visible. */
const SKIP_PATTERNS = [
  /\bclassName\s*=/,           // CSS classes
  /\bstyle\s*=/,               // inline styles
  /\bsrc\s*=\s*"/,             // image / iframe URLs
  /\bhref\s*=\s*"/,            // links
  /\bdata-[a-z-]+\s*=/,        // data-* attributes
  /\baria-(?!label)[a-z-]+\s*=/, // aria-* (but keep aria-label)
  /\brole\s*=/,
  /\bid\s*=\s*"/,
  /\bname\s*=\s*"/,            // form field names — handled by browser, not localised
  /\bvalue\s*=\s*"[a-z_-]+"/,  // form values like "VIEWER"
  /\btype\s*=\s*"/,
  /\baccept\s*=\s*"/,
  /\bautoComplete\s*=\s*"/,
  /\bencType\s*=\s*"/,
  /\baction\s*=\s*"/,
  /\bmethod\s*=\s*"/,
  /\bdisabled\b/,
  /\brequired\b/,
];

/**
 * Find user-visible string literals in a line.
 * Returns array of {snippet, kind} for things that look hardcoded.
 */
function scanLine(line) {
  const findings = [];
  if (line.includes("import ") || line.includes("from '") || line.includes('from "')) return findings;
  if (line.trim().startsWith('//') || line.trim().startsWith('*')) return findings;
  if (line.trim().startsWith('/*') || line.trim().startsWith('*/')) return findings;
  for (const re of SKIP_PATTERNS) {
    if (re.test(line)) return findings;
  }

  // Match user-visible JSX prop assignments: foo="text"
  const propRegex = new RegExp(
    `\\b(${USER_VISIBLE_PROP_NAMES.join('|')})\\s*=\\s*"([^"\\\\]+(?:\\\\.[^"\\\\]*)*)"`,
    'g',
  );
  let m;
  while ((m = propRegex.exec(line)) !== null) {
    const value = m[2];
    if (looksLikeUiText(value)) {
      findings.push({ snippet: `${m[1]}="${value}"`, kind: 'jsx-prop' });
    }
  }

  // Match JSX text content: >  Text content here  <
  // Conservative: skip lines that look like TypeScript signatures
  // (function generics, type unions, return types) — they fool the
  // > ... < pattern. Identifiable by the `):` return-type marker or
  // a line beginning with `function` / `export function`.
  if (!/[)>]\s*:\s*[A-Z][a-zA-Z<>,\s|&]+[;{=]/.test(line)
      && !/^\s*(export\s+)?(function|interface|type)\s/.test(line)) {
    const textRegex = />([^<>{}\n]+?)</g;
    while ((m = textRegex.exec(line)) !== null) {
      const value = m[1].trim();
      if (value && looksLikeUiText(value)) {
        findings.push({ snippet: `>${value}<`, kind: 'jsx-text' });
      }
    }
  }

  return findings;
}

function looksLikeUiText(s) {
  s = s.trim();
  if (!s) return false;
  if (s.length < 3) return false;                       // single chars / 2-char codes
  if (/^[A-Z_]+$/.test(s)) return false;                // ENUM_LIKE
  if (/^[a-z_-]+$/.test(s) && !s.includes(' ')) return false; // single-word lowercase
  if (/^\d/.test(s)) return false;                      // starts with digit
  if (/^[a-z]+\.[a-z]/i.test(s)) return false;          // file/extension/dot-separated
  if (/^https?:/.test(s)) return false;                 // URL
  if (/^[/.]/.test(s)) return false;                    // path
  if (/^\$\{/.test(s)) return false;                    // template literal expression
  if (/^[a-z]+$/i.test(s) && s.length < 5) return false; // short single word
  // Look for multi-word OR sentence-shaped text — title-cased phrases,
  // strings with spaces, or strings ending with a sentence terminator
  return /\s/.test(s) || /[A-Z][a-z]/.test(s);
}

const findings = [];
for (const file of walk(ROOT)) {
  // Skip the i18n module itself + obvious test files
  if (file.includes('/i18n/messages.ts')) continue;
  if (file.includes('runbook') || file.includes('Runbook')) continue;  // markdown runbooks aren't UI strings

  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const found = scanLine(lines[i]);
    for (const f of found) {
      findings.push({
        file: file.replace(ROOT, '(admin)/admin').replace(/\\/g, '/'),
        line: i + 1,
        ...f,
      });
    }
  }
}

if (asJson) {
  process.stdout.write(JSON.stringify({ findings, count: findings.length }, null, 2));
  process.stdout.write('\n');
} else {
  process.stdout.write(`i18n coverage scan — ${findings.length} hardcoded string(s) under (admin)/admin\n\n`);
  if (findings.length > 0) {
    // Group by file
    const byFile = new Map();
    for (const f of findings) {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file).push(f);
    }
    for (const [file, items] of byFile) {
      process.stdout.write(`  ${file}\n`);
      for (const it of items) {
        const trimmed = it.snippet.length > 80 ? it.snippet.slice(0, 77) + '…' : it.snippet;
        process.stdout.write(`    L${String(it.line).padStart(4)}  ${trimmed}\n`);
      }
    }
  }
}

if (findings.length > max) {
  process.stderr.write(
    `\nFAIL: ${findings.length} hardcoded string(s) > budget of ${max}.\n` +
    `Either translate them via 'page.X.Y' keys in i18n/messages.ts or\n` +
    `raise --max in the npm script if the remainder is intentional.\n`,
  );
  process.exit(1);
}
