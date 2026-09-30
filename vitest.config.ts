import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Tests run against source, not dist, so `npm test` never depends on build order.
 * The alias list mirrors the `paths` entry in tsconfig.json.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@algoplot\/core$/, replacement: src('./packages/core/src/index.ts') },
      { find: /^@algoplot\/python$/, replacement: src('./packages/python/src/index.ts') },
      { find: /^@algoplot\/react$/, replacement: src('./packages/react/src/index.ts') },
      { find: /^@algoplot\/element$/, replacement: src('./packages/element/src/index.ts') },
      { find: /^@algoplot\/remark$/, replacement: src('./packages/remark/src/index.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['packages/*/src/**/*.test.{ts,tsx}'],
  },
});
