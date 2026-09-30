import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2021',
    sourcemap: true,
    lib: {
      entry: { index: 'src/index.ts' },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [/^@algoplot\/(core|python)(\/|$)/],
    },
  },
});
