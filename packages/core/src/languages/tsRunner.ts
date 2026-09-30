import { jsRunner } from './jsRunner';
import type { LanguageRunner, RunEnv } from './types';

type Transform = (code: string) => string;

interface SucraseModule {
  transform: (code: string, options: object) => { code: string };
}

let transform: Transform | null = null;

/**
 * TypeScript is JavaScript with the type layer removed, so this runner strips the
 * annotations and hands the result to the JS runner. Sucrase is used because its
 * transform is line-preserving, which matters here: the executing-line highlight maps
 * the line reported by the recorder back onto the source the user is looking at, so a
 * transform that reflowed lines would point at the wrong statement.
 */
async function loadTransform(): Promise<Transform> {
  if (transform) return transform;
  let strip: SucraseModule['transform'];
  if (typeof process !== 'undefined' && process.versions?.node) {
    // Node — the remark plugin at build time, tests, scripts — goes through the
    // package's CommonJS build: `sucrase/dist/esm/index.js` is written for bundlers,
    // and its own extensionless internal imports are exactly what native ESM rejects
    // (Astro's config realm imports it raw and dies on `./CJSImportProcessor`).
    // `createRequire` itself comes from a dynamic import guarded by a function call,
    // so no bundler sees a `node:module` or a bare `sucrase` specifier to hoist —
    // the app build still ships no stripper to readers who never open TS.
    const { createRequire } = (await import(/* @vite-ignore */ 'node:module')) as {
      createRequire(url: string): (id: string) => unknown;
    };
    const req = createRequire(import.meta.url);
    strip = (req('sucrase') as SucraseModule).transform;
  } else {
    // Browser and worker: the ESM build, imported by path on purpose — Rollup
    // externalizes it, keeping the whole stripper out of the eagerly loaded entry
    // chunk. The worker's own pipeline bundles it, where Vite's resolver supplies
    // the extensions native ESM would demand.
    const mod = (await import('sucrase/dist/esm/index.js')) as { transform: SucraseModule['transform'] };
    strip = mod.transform;
  }
  const t = (code: string) =>
    strip(code, {
      transforms: ['typescript'],
      disableESTransforms: true,
    }).code;
  transform = t;
  return t;
}

export const tsRunner: LanguageRunner = {
  id: 'ts',
  async ensure() {
    await loadTransform();
  },
  async execute(env: RunEnv, code: string) {
    const strip = await loadTransform();
    await jsRunner.execute(env, strip(code));
  },
};
