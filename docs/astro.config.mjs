import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkAlgoplot from '@algoplot/remark';
// Registers the `py` runner in *this* realm — the build machine — so ```algoplot
// python fences execute here, from the npm pyodide package, not a CDN.
import '@algoplot/python';

// DOCS_BASE is set in CI when the site is served from a project page
// (`DOCS_BASE=/algoplot-lib`); locally it is the root.
const base = process.env.DOCS_BASE ?? '';

export default defineConfig({
  base,
  integrations: [react(), mdx()],
  markdown: {
    // html mode for every markdown pipeline here — the element keeps content pages
    // framework-free. (One processor serves .md and .mdx alike, so the site picks one
    // mode; jsx mode is for MDX pipelines in consumers' own builds — see the fences
    // guide.)
    processor: unified({
      remarkPlugins: [[remarkAlgoplot, { mode: 'html' }]],
    }),
  },
});
