import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // ── Project-specific ignores ────────────────────────────────────
    // Vendored Cesium runtime mirrored at build time by
    // scripts/copy-cesium-assets.mjs. Third-party code we don't author
    // or maintain — linting it produces thousands of false positives
    // (eval-style indirection in their workers, IIFE patterns, etc).
    "public/cesium/**",

    // Claude Code agent worktrees — temporary copies of the repo used
    // by the Agent tool's `isolation: worktree` mode. They contain
    // build artefacts (.next/dev/types) and stale source from
    // in-flight tasks. Never our code-of-record.
    ".claude/worktrees/**",

    // Generated API types — regenerated from the OpenAPI schema; any
    // stylistic complaints here are fights with the generator.
    "src/lib/api-types.generated.ts",
  ]),
]);

export default eslintConfig;
