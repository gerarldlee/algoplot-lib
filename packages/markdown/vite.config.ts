import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2021',
    sourcemap: true,
    lib: {
      entry: { index: 'src/index.tsx' },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
  },
});
