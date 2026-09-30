import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2021',
    sourcemap: true,
    lib: {
      // `index` self-registers the Python runner on import; `workerEntry` does the same
      // inside a worker before attaching the core message handler.
      entry: {
        index: 'src/index.ts',
        workerEntry: 'src/workerEntry.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // `node:url` guards the Node-only loader path; keeping it external stops the
      // browser build from trying to inline a builtin.
      external: [/^@algoplot\/core(\/|$)/, /^node:/],
    },
  },
});
