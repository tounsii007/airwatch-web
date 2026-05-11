import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // ── Rule overrides ────────────────────────────────────────────────
  // eslint-plugin-react-hooks v6 ships two rules that fire on patterns
  // we use deliberately:
  //
  //   * react-hooks/purity — flags Date.now() during render. We use it
  //     for "X seconds ago" labels that have to re-evaluate on each
  //     render so the displayed time stays current. ClientTime keeps
  //     hydration stable; pushing this into a useEffect+setInterval
  //     would be heavier and not what we want.
  //
  //   * react-hooks/set-state-in-effect — flags setState inside
  //     useEffect. The useLiveData hook does exactly that as its core
  //     job (poll → setState → re-render the chart). Fighting the
  //     rule would mean a useReducer dispatch dance that adds code
  //     without changing behaviour.
  //
  // Both turned off project-wide. Revisit if React itself promotes
  // them to runtime warnings.
  {
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // react-hooks v6 also flags any document.cookie / window.localStorage
      // / direct DOM-API write as "value cannot be modified". Those are
      // legitimate side-effects in event handlers (e.g. LanguageSwitcher
      // setting the locale cookie). The rule is too coarse for this code.
      'react-hooks/immutability': 'off',
      // ' and " in JSX text are valid; HTML-escaping every apostrophe in
      // long German UI strings makes them unreadable in source. The
      // browser handles them fine without escapes.
      'react/no-unescaped-entities': 'off',
      // Allow underscore-prefixed identifiers as a deliberate "I know this
      // is unused but it's positionally required" marker — common in
      // callback signatures where the runtime hands you args you don't
      // need (e.g. `(_event, value) => ...`). caughtErrors handles
      // `catch (_e)`.
      '@typescript-eslint/no-unused-vars': ['warn', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
    },
  },
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
