import { Recorder } from './recorder';
import { Rng } from './rng';
import { VizApi } from './viz/api';
import { collect, describeError, type RunEnv, type RunOutput } from './run';
import { LANGUAGES } from './languages/types';
import { runnerFor } from './languages/registry';

export interface ExecuteRunOptions {
  /** Language id; unregistered languages fall back to JavaScript exactly as `runnerFor` does. */
  language?: string;
  input?: unknown;
  seed?: number;
  /** Falls back to the language's own budget (see `LANGUAGES`). */
  maxSteps?: number;
  maxMs?: number;
}

/**
 * Run source to a `RunOutput` without a worker — the same orchestration the worker
 * performs, for callers already on the main thread: the remark plugin executing a
 * fence at build time, and tests. Errors are folded into the output (`ok: false`)
 * rather than thrown, so a failed algorithm still reports the steps it recorded before
 * the throw, exactly like the worker's `done` message does.
 */
export async function executeRun(code: string, opts: ExecuteRunOptions = {}): Promise<RunOutput> {
  const runner = runnerFor(opts.language);
  const defaults = LANGUAGES[runner.id].defaults;
  const rec = new Recorder({
    maxSteps: opts.maxSteps ?? defaults.maxSteps,
    maxMs: opts.maxMs ?? defaults.maxMs,
  });
  const rng = new Rng(opts.seed ?? 42);
  try {
    await runner.ensure();
    const env: RunEnv = { rec, viz: new VizApi(rec, rng), rng, input: opts.input };
    await runner.execute(env, code);
    rec.record();
    return collect(rec);
  } catch (e) {
    const reported = describeError(e);
    return collect(rec, {
      message: reported?.message ?? String(e),
      ...(reported?.line !== undefined ? { line: reported.line } : {}),
    });
  }
}
