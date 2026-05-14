/**
 * Stub for `@spz-loader/core` — aliased in next.config.ts.
 *
 * Why this exists:
 *   Cesium's GltfSpzLoader.js does `import { loadSpz } from "@spz-loader/core"`
 *   at module top-level. The real package's dist/index.js inlines its
 *   ~1 MB WebAssembly module as a single JS template literal (line 811).
 *   That template literal contains byte sequences like `\00`, `\01`, etc.,
 *   which both Webpack and Turbopack emit verbatim into the bundle — and
 *   JavaScript engines reject as invalid octal escapes inside template
 *   literals (SyntaxError). The whole Cesium chunk then fails to parse and
 *   /globe shows a black screen.
 *
 *   AirWatch doesn't use Gaussian-Splatting 3D-Tiles content. The only
 *   call site (GltfSpzLoader._load) only runs when a glTF model actually
 *   references SPZ data — which our aircraft-point markers never do.
 *   Replacing the package with these no-op exports lets the rest of
 *   Cesium load fine. If we ever do want SPZ, swap this alias for the
 *   real package and accept the bundler workarounds.
 */
const loadSpz = async () => {
  throw new Error('SPZ Gaussian-Splatting loader is stubbed out in AirWatch — see src/lib/stubs/spz-loader.js');
};

const loadSpzFromUrl = async () => {
  throw new Error('SPZ Gaussian-Splatting loader is stubbed out in AirWatch — see src/lib/stubs/spz-loader.js');
};

export { loadSpz, loadSpzFromUrl };
export default { loadSpz, loadSpzFromUrl };
