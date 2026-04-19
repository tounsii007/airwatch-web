#!/usr/bin/env node
// One-shot: rewrite relative imports (../, ./) to @/-path-alias imports.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Walk a directory tree yielding all .ts/.tsx files. */
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|mts)$/.test(name)) yield full;
  }
}

/** Resolve a relative import specifier to a path under src/ → `@/…`. */
function toAliasPath(fromFile, spec) {
  const abs = resolve(dirname(fromFile), spec);
  const rel = relative(SRC, abs).split(sep).join('/');
  if (rel.startsWith('..')) return null; // outside src — leave alone
  return `@/${rel}`;
}

const IMPORT_RE = /(from\s+['"])(\.\.?\/[^'"]*)(['"])/g;

let changed = 0;
for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(IMPORT_RE, (match, pre, spec, post) => {
    const aliased = toAliasPath(file, spec);
    return aliased ? `${pre}${aliased}${post}` : match;
  });
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

console.log(`rewrote imports in ${changed} files`);
