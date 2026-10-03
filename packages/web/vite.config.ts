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
      // Nothing is external: the whole point of the element is one drop-in file that
      // works from a plain <script type="module"> with no package manager at all.
      external: [],
    },
  },
});
