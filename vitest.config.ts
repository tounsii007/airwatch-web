import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Two test environments:
 *   - node:     stores, pure utils, URL helpers (fast, no DOM).
 *   - happy-dom: component + hook tests (React Testing Library, WebSocket polyfill).
 *
 * Vitest picks the env per file via the `// @vitest-environment ...` pragma
 * at the top of the test file. Default stays `node`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    pool: 'threads',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/e2e/**', '**/.claude/**'],
  },
});
