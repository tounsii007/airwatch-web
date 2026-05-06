/**
 * Client-side source-map de-minification for stack traces. (Phase 3)
 *
 * <h3>Why client-side</h3>
 * Production builds ship minified chunks like {@code 0nt9w65twgo8t.js};
 * an uncaught exception's {@code Error.stack} points at those mangled
 * names + line/column inside the bundled output, useless for triage.
 *
 * Two paths to fix this:
 *   1. <b>Server-side resolution</b> — Java backend reads .js.map files
 *      and rewrites stacks. Needs a sourcemap parser in Java + a way
 *      for the backend to know which build a given chunk came from.
 *      Heavyweight.
 *   2. <b>Client-side resolution</b> (this module) — the browser
 *      already has the .js URLs in {@code Error.stack}, the .js.map
 *      files are emitted next to the JS by Next.js, and {@code source-map-js}
 *      is a 30 KB browser-friendly mappings parser. The reporter
 *      resolves the stack before POSTing, then sends both the raw and
 *      resolved versions for forensic safety.
 *
 * <h3>Caching</h3>
 * SourceMapConsumer is expensive to instantiate (~50ms for a 5MB map);
 * we cache one per .js.map URL for the page lifetime. A typical
 * uncaught error references 3–6 distinct chunks; the cache pays off
 * immediately.
 *
 * <h3>What's preserved on failure</h3>
 * Resolution is best-effort: if a .js.map isn't reachable (404, network
 * error, sourcemap disabled), the original frame is kept verbatim. The
 * resolved string is "best frame available, in order" — never empty.
 * This means the operator always sees something useful, never a NULL.
 */

import { SourceMapConsumer, type RawSourceMap } from 'source-map-js';

/**
 * Stack-frame patterns with numbered groups for tsconfig compatibility
 * (named groups need ES2018+; we target lower for max browser reach).
 *
 * Tuple shape: [regex, fnIdx, urlIdx, lineIdx, colIdx]
 *   - fnIdx === -1 means "no function-name capture" (anonymous frame)
 */
type FramePattern = readonly [RegExp, number, number, number, number];

const STACK_FRAME_PATTERNS: FramePattern[] = [
  // Chrome / Edge / Node — "    at functionName (URL:line:col)"
  [/^\s*at\s+(.+?)\s+\((https?:\/\/[^\s)]+?):(\d+):(\d+)\)\s*$/, 1, 2, 3, 4],
  // Chrome / Edge — anonymous "    at URL:line:col"
  [/^\s*at\s+(https?:\/\/[^\s)]+?):(\d+):(\d+)\s*$/, -1, 1, 2, 3],
  // Firefox / Safari — "functionName@URL:line:col"
  [/^([^@]+)@(https?:\/\/[^\s]+?):(\d+):(\d+)\s*$/, 1, 2, 3, 4],
  // Firefox / Safari anonymous — "@URL:line:col"
  [/^@(https?:\/\/[^\s]+?):(\d+):(\d+)\s*$/, -1, 1, 2, 3],
];

interface ParsedFrame {
  raw: string;
  fn: string;
  url: string;
  line: number;
  col: number;
}

function parseFrame(line: string): ParsedFrame | null {
  for (const [re, fnIdx, urlIdx, lineIdx, colIdx] of STACK_FRAME_PATTERNS) {
    const m = re.exec(line);
    if (!m) continue;
    return {
      raw: line,
      fn: (fnIdx >= 0 ? m[fnIdx] : '<anonymous>').trim(),
      url: m[urlIdx],
      line: parseInt(m[lineIdx], 10),
      col: parseInt(m[colIdx], 10),
    };
  }
  return null;
}

/** Per-page-lifetime cache. `null` = we tried to fetch + failed. */
const consumerCache = new Map<string, SourceMapConsumer | null>();

async function consumerFor(jsUrl: string): Promise<SourceMapConsumer | null> {
  if (consumerCache.has(jsUrl)) return consumerCache.get(jsUrl) ?? null;

  // .map files live next to the .js — same path + ".map" suffix.
  const mapUrl = jsUrl + '.map';
  try {
    const res = await fetch(mapUrl, { credentials: 'omit', cache: 'force-cache' });
    if (!res.ok) {
      consumerCache.set(jsUrl, null);
      return null;
    }
    const json = (await res.json()) as RawSourceMap;
    const consumer = new SourceMapConsumer(json);
    consumerCache.set(jsUrl, consumer);
    return consumer;
  } catch {
    consumerCache.set(jsUrl, null);
    return null;
  }
}

/**
 * De-minify one stack frame using a SourceMapConsumer. Returns a
 * formatted string: {@code "    at <originalFn> (<originalSource>:<line>:<col>)"}.
 */
function resolveFrame(consumer: SourceMapConsumer, frame: ParsedFrame): string {
  const original = consumer.originalPositionFor({ line: frame.line, column: frame.col });
  if (!original.source) return frame.raw;
  const fn = original.name ?? frame.fn;
  // Truncate very long source paths (webpack:///./src/app/... can be > 100 chars)
  // to keep the persisted stack readable in the dashboard.
  const source = original.source.length > 200
    ? '…' + original.source.slice(-200)
    : original.source;
  return `    at ${fn} (${source}:${original.line}:${original.column})`;
}

/**
 * Resolve every frame in a stack trace using the matching .js.map.
 * Falls back to the raw frame if any step fails.
 *
 * <p>Bounded by {@link MAX_FRAMES} to avoid pathological cases (an
 * infinite recursion stack can be thousands of frames deep — we don't
 * need them all to triage).
 */
const MAX_FRAMES = 50;

export async function resolveStackTrace(rawStack: string | undefined): Promise<string | undefined> {
  if (!rawStack) return rawStack;
  const lines = rawStack.split('\n').slice(0, MAX_FRAMES);
  const resolved: string[] = [];
  for (const line of lines) {
    const frame = parseFrame(line);
    if (!frame) {
      resolved.push(line);
      continue;
    }
    const consumer = await consumerFor(frame.url);
    if (!consumer) {
      resolved.push(line);
      continue;
    }
    try {
      resolved.push(resolveFrame(consumer, frame));
    } catch {
      resolved.push(line);
    }
  }
  return resolved.join('\n');
}

/** For tests + manual cache reset (useful after a redeploy). */
export function __clearSourceMapCache(): void {
  consumerCache.clear();
}
