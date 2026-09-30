import type { RunOutput } from '../run';
import type { GrowthPoint } from '../complexity';
import type { LanguageId } from '../languages/registry';

export interface RunRequest {
  id: number;
  code: string;
  input: unknown;
  maxSteps: number;
  maxMs: number;
  seed: number;
  language: LanguageId;
}

/**
 * A growth sweep: the same source run once per size. Inputs are grown on the main thread,
 * so the worker needs to know nothing about template structure - it just runs a list.
 */
export interface MeasureRequest {
  id: number;
  code: string;
  language: LanguageId;
  seed: number;
  maxSteps: number;
  maxMs: number;
  inputs: { n: number; input: unknown }[];
}

export type WorkerResponse =
  | { id: number; type: 'done'; output: RunOutput }
  | { id: number; type: 'error'; message: string; line?: number }
  /** Streamed once per size, as each one finishes, so the dialog can fill in live. */
  | { id: number; type: 'point'; point: GrowthPoint }
  | { id: number; type: 'measured' };
