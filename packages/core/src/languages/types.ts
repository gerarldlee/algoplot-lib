import type { Recorder } from '../recorder';
import type { Rng } from '../rng';
import type { VizApi } from '../viz/api';

export type LanguageId = 'js' | 'ts' | 'py';

export interface LanguageDef {
  id: LanguageId;
  label: string;
  /** Short tag for the template picker badges. */
  badge: string;
  ext: string;
  /**
   * Per-language run budgets. Python is an order of magnitude slower per viz call than
   * JavaScript under WASM, so it gets a smaller step cap and a longer wall clock.
   */
  defaults: { maxSteps: number; maxMs: number };
}

export const LANGUAGES: Record<LanguageId, LanguageDef> = {
  js: { id: 'js', label: 'JavaScript', badge: 'JS', ext: 'js', defaults: { maxSteps: 10000, maxMs: 5000 } },
  ts: { id: 'ts', label: 'TypeScript', badge: 'TS', ext: 'ts', defaults: { maxSteps: 10000, maxMs: 5000 } },
  py: { id: 'py', label: 'Python', badge: 'PY', ext: 'py', defaults: { maxSteps: 5000, maxMs: 20000 } },
};

export const LANGUAGE_LIST: LanguageDef[] = [LANGUAGES.js, LANGUAGES.ts, LANGUAGES.py];

export const DEFAULT_LANGUAGE: LanguageId = 'js';

export function isLanguageId(v: unknown): v is LanguageId {
  return v === 'js' || v === 'ts' || v === 'py';
}

/** Everything a runtime needs to drive one recording. */
export interface RunEnv {
  rec: Recorder;
  viz: VizApi;
  rng: Rng;
  input: unknown;
}

export interface LanguageRunner {
  readonly id: LanguageId;
  /** Load the runtime if it is not resident yet. Safe to call repeatedly. */
  ensure(): Promise<void>;
  /** Execute user code against the viz API. Throws to signal failure. */
  execute(env: RunEnv, code: string): Promise<void>;
  dispose?(): void;
}
