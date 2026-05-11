/**
 * Pure helpers extracted from check-bundle-budget.mjs so they can be
 * unit-tested without spinning up `next build`.
 *
 * The CLI script imports these and stays focused on file I/O. The
 * logic that decides "is this chunk lazy-3D" lives here.
 */

/**
 * Sentinel strings that, if present in a chunk, classify it as LAZY-3D.
 * Each entry is paired with a human label so the report explains *why*
 * a chunk landed in the lazy bucket.
 */
export const LAZY_3D_MARKERS = [
  { needle: 'Cesium',  reason: 'Cesium 3D globe runtime (/globe)' },
  { needle: '@deck.gl', reason: 'deck.gl WebGL replay (/replay/3d)' },
  { needle: 'deck.gl',  reason: 'deck.gl WebGL replay (/replay/3d)' },
];

/** Default gzipped budgets in bytes. Calibrated against the current
 *  build with comfortable headroom; recompute after major dep bumps. */
export const DEFAULT_BUDGETS = {
  core: 1_000 * 1024,
  lazy3d: 1_800 * 1024,
  perChunkMax: 1_500 * 1024,
  cssRaw: 150 * 1024,
};

/** Human-friendly byte formatter (B / KB / MB). */
export function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Decide which bucket a chunk falls into based on its raw bytes.
 * Streams the buffer through the LAZY_3D_MARKERS substring checks;
 * first match wins. Anything that doesn't match a sentinel is treated
 * as CORE (every-user code).
 *
 * @param {Buffer | Uint8Array | string} chunkBytes
 * @returns {{ bucket: 'core' | 'lazy3d', reason: string }}
 */
export function classify(chunkBytes) {
  const text = typeof chunkBytes === 'string'
    ? chunkBytes
    : Buffer.from(chunkBytes).toString('utf8');
  for (const { needle, reason } of LAZY_3D_MARKERS) {
    if (text.includes(needle)) return { bucket: 'lazy3d', reason };
  }
  return { bucket: 'core', reason: 'shared / per-route runtime' };
}

/**
 * Compute the budget verdict for a set of (already-classified) chunks.
 * Returns the same shape the CLI prints, but as data — the CLI can
 * format it for humans, tests can assert on the numbers.
 *
 * @param {{ chunks: Array<{ gzipSize: number, bucket: string }>,
 *           cssBytes: number,
 *           budgets?: typeof DEFAULT_BUDGETS }} input
 */
export function computeVerdict(input) {
  const { chunks, cssBytes, budgets = DEFAULT_BUDGETS } = input;
  let coreTotal = 0;
  let lazyTotal = 0;
  let largestChunkGzip = 0;
  for (const c of chunks) {
    if (c.bucket === 'lazy3d') lazyTotal += c.gzipSize;
    else coreTotal += c.gzipSize;
    if (c.gzipSize > largestChunkGzip) largestChunkGzip = c.gzipSize;
  }
  const failures = [];
  if (coreTotal > budgets.core) {
    failures.push({ name: 'Core', actual: coreTotal, limit: budgets.core });
  }
  if (lazyTotal > budgets.lazy3d) {
    failures.push({ name: 'Lazy 3D', actual: lazyTotal, limit: budgets.lazy3d });
  }
  if (largestChunkGzip > budgets.perChunkMax) {
    failures.push({ name: 'Largest chunk', actual: largestChunkGzip, limit: budgets.perChunkMax });
  }
  if (cssBytes > budgets.cssRaw) {
    failures.push({ name: 'CSS (raw)', actual: cssBytes, limit: budgets.cssRaw });
  }
  return {
    coreTotal,
    lazyTotal,
    largestChunkGzip,
    cssBytes,
    failures,
    ok: failures.length === 0,
  };
}
