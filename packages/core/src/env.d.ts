/// <reference types="vite/client" />

/**
 * sucrase ships an ESM build alongside its CommonJS entry but no type declarations for
 * it. Only `transform` is used, and the deep import is deliberate - see tsRunner.ts.
 */
declare module 'sucrase/dist/esm/index.js' {
  export function transform(code: string, options: Record<string, unknown>): { code: string };
}
