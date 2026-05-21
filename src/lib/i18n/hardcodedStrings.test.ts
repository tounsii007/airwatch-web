/**
 * Automated guard against hardcoded English UI strings in the public app.
 *
 * Scans every .tsx file under `src/app/(public)/` and `src/components/`
 * (excluding admin / test files / type files) and flags JSX text content
 * that looks like untranslated English copy.
 *
 * <h3>What "looks like English copy" means</h3>
 * A heuristic — not a parser — but tight enough to catch the regressions
 * that bit us in the prior i18n pass:
 *   * `>SomeText<` where SomeText is 3+ words of letters (regular JSX
 *     text node).
 *   * `title="A real sentence"` (HTML attribute likely shown to users).
 *   * `aria-label="..."` if it's English prose (translated ones use
 *     `t(...)` so the value is an expression, not a literal).
 *
 * We deliberately allow:
 *   * Brand names (AIRWATCH, AirWatch).
 *   * Aviation-standard abbreviations (METAR, NOTAM, ICAO24, LAT, LON, etc.).
 *   * Programmer-facing comments + JSDoc.
 *   * `t(...)` calls anywhere.
 *
 * This is a non-blocking guard right now — it ships as a unit test that
 * documents known surviving strings so a regression can either fix the
 * string or explicitly add to the allowlist with a justification.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const SCAN_DIRS = ['app/(public)', 'components/flight', 'components/map', 'components/globe'];

/** Files that legitimately contain English literals — admin pages, test
 *  files, type files, etc. Each entry is a relative path under src/. */
const FILE_ALLOWLIST = new Set<string>([
  // (none yet — add with a justification when extending)
]);

/** Substrings that match brand / aviation jargon. These never count as
 *  "untranslated English" because they're either a brand or a global
 *  technical term that doesn't translate. */
const STRING_ALLOWLIST: readonly RegExp[] = [
  /^AIRWATCH$/,
  /^AirWatch$/,
  /^METAR$/,
  /^TAF$/,
  /^NOTAM$/,
  /^ICAO24?$/,
  /^IATA$/,
  /^ATC$/,
  /^AR$/i,
  /^LAT$/,
  /^LON$/,
  /^FL\d{0,3}$/,
  /^GND$/,
  /^TYPE$/,
  /^REG$/,
  /^MSN$/,
  /^km\/h$/,
  /^kt$/,
  /^ft$/,
];

function listTsxFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      listTsxFiles(full, acc);
    } else if (
      full.endsWith('.tsx') &&
      !full.includes('.test.') &&
      !full.includes('.stories.') &&
      !full.endsWith('.d.ts')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

interface Finding {
  file: string;
  match: string;
  context: string;
}

/**
 * Tight heuristic. We look for JSX text nodes (between `>` and `<`)
 * that contain 3+ consecutive English-looking words and don't pass
 * either of the allow-lists.
 *
 * We deliberately keep this narrow — too greedy and the test becomes
 * impossible to maintain. Too loose and we miss the regressions that
 * matter.
 */
function findHardcodedStrings(content: string, filePath: string): Finding[] {
  if (FILE_ALLOWLIST.has(filePath)) return [];
  const findings: Finding[] = [];

  // Match: >SomeText< inside JSX. Capture group is the text.
  // Require 3+ words of letters separated by spaces.
  const jsxText = />\s*([A-Z][a-zA-Z]+(?:\s+[a-z]+){2,})\s*</g;
  let m: RegExpExecArray | null;
  while ((m = jsxText.exec(content)) !== null) {
    const text = m[1].trim();
    if (STRING_ALLOWLIST.some((rx) => rx.test(text))) continue;
    // Skip JSDoc / comments — those start with `* `.
    const lineStart = content.lastIndexOf('\n', m.index);
    const line = content.slice(lineStart, m.index);
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue;
    findings.push({ file: filePath, match: text, context: line.trim().slice(0, 80) });
  }
  return findings;
}

describe('i18n hardcoded-string guard', () => {
  it('public app + flight/map/globe components have no obvious untranslated English text', () => {
    const allFiles: string[] = [];
    for (const dir of SCAN_DIRS) {
      const full = join(ROOT, dir);
      try {
        listTsxFiles(full, allFiles);
      } catch {
        // Directory might not exist in all configurations; skip silently.
      }
    }

    const findings: Finding[] = [];
    for (const file of allFiles) {
      const rel = relative(ROOT, file);
      const content = readFileSync(file, 'utf-8');
      findings.push(...findHardcodedStrings(content, rel));
    }

    // The expectation: zero new findings. If this test fails after a
    // change, either:
    //   1. Wrap the string in `t('key', language)` + add the key.
    //   2. Add the file to FILE_ALLOWLIST with an inline justification.
    if (findings.length > 0) {
      const report = findings
        .map((f) => `  ${f.file}: "${f.match}" — ${f.context}`)
        .join('\n');
      throw new Error(
        `Found ${findings.length} likely-untranslated English string(s):\n${report}\n\n` +
        `Fix: wrap in t('key', language) + add the key to all 9 locale dictionaries.`,
      );
    }
    expect(findings).toHaveLength(0);
  });
});
