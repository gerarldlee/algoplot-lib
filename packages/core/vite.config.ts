import { defineConfig } from 'vite';

export default defineConfig({
  // The worker shares modules with the main entry (the language registry must be one
  // Map per realm), so it code-splits — IIFE/UMD cannot, which is exactly the error the
  // app's vite.config.ts already heads off with this same line.
  worker: {
    format: 'es',
  },
  // Relative asset URLs: an absolute `/assets/...` worker path resolves against the
  // origin root, which breaks any page not served from `/` (GitHub Pages project
  // sites, apps under a base path). `new URL('./assets/...', import.meta.url)` stays
  // correct wherever dist lands.
  base: './',
  build: {
    target: 'es2021',
    sourcemap: true,
    lib: {
      // The worker is a real entry so its URL is stable in `dist/` for consumers whose
      // bundler cannot follow `new Worker(new URL(...))` — they resolve
      // `@algoplot/core/worker` and hand it over as
      // `new WorkerRunner({ createWorker: () => new Worker(url, { type: 'module' }) })`.
      entry: {
        index: 'src/index.ts',
        'worker/runner.worker': 'src/worker/runner.worker.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Declared dependencies stay external: consumers install them, and sucrase is
      // loaded by a dynamic import that must not enter the entry chunk. `node:`
      // builtins stay external too: Vite's default for a browser-target build is to
      // *stub* them with an empty module, which turns `createRequire` into undefined
      // at the one place Node needs it (tsRunner's require of sucrase) — the failure
      // is a plain "s is not a function" far from its cause. Browser code never
      // evaluates these branches.
      external: ['zustand', /^sucrase(\/|$)/, /^node:/],
    },
  },
});
