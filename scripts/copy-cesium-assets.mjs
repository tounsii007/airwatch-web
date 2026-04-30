/**
 * Copy Cesium's Workers / ThirdParty / Assets / Widgets directories
 * from the npm package into `public/cesium/` so they're served same-origin
 * by Next.js.
 *
 * Why: GlobeView.tsx used to set
 *   window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/...'
 * which makes Cesium fetch its 50+ workers / WASM / texture atlases
 * directly from the cesium.com CDN. That:
 *   1. leaks the upstream provider into the user's browser Network tab,
 *   2. requires `cesium.com` in our CSP `script-src`/`connect-src`/
 *      `worker-src`/`img-src` — broadening the attack surface,
 *   3. fails when the user is offline / behind a proxy that blocks
 *      cesium.com,
 *   4. adds 200–500 ms latency for first globe load on remote regions.
 *
 * Mirroring locally fixes all four. Cost: ~12 MB extra in `public/`,
 * served same-origin with nginx-cacheable URLs.
 *
 * Runs from the package.json `prebuild` hook so a fresh `next build`
 * always has the latest assets matching the installed cesium version.
 */
import { cp, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const SRC = resolve(projectRoot, 'node_modules/cesium/Build/Cesium');
const DST = resolve(projectRoot, 'public/cesium');

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

if (!(await exists(SRC))) {
  console.error(`[cesium] expected assets at ${SRC} but they're missing — `
              + `did you run 'npm install'?`);
  process.exit(1);
}

// Wipe target so removed-from-cesium files don't linger across version bumps.
if (await exists(DST)) await rm(DST, { recursive: true, force: true });

await cp(SRC, DST, { recursive: true });

console.log(`[cesium] mirrored ${SRC} → ${DST}`);
