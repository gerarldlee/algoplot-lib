import { Rng } from '../rng';
import { Recorder } from '../recorder';
import { VizApi } from '../viz/api';
import { collect, type RunEnv } from '../run';
import { executeRun } from '../exec';
import type { GrowthPoint } from '../complexity';
import { runnerFor } from '../languages/registry';
import type { MeasureRequest, RunRequest, WorkerResponse } from './protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Runs are serialised: loading a runtime (Pyodide takes seconds on a cold start) must
 * not interleave with a second Compile, and one runtime instance cannot be driven by two
 * recorders at once. A growth sweep is the same story stretched over several runs, which
 * is why the UI disables Compile while one is in flight.
 */
let busy = false;

ctx.onmessage = (ev: MessageEvent<RunRequest | MeasureRequest>) => {
  const req = ev.data;
  if (busy) {
    const res: WorkerResponse = { id: req.id, type: 'error', message: 'a compile is already in progress' };
    ctx.postMessage(res);
    return;
  }
  busy = true;
  void (isMeasure(req) ? measure(req) : handle(req)).finally(() => {
    busy = false;
  });
};

function isMeasure(req: RunRequest | MeasureRequest): req is MeasureRequest {
  return 'inputs' in req;
}

async function handle(req: RunRequest): Promise<void> {
  // `executeRun` is the same orchestration the worker used to spell out itself, kept
  // in the main-thread entry so the remark plugin can run fences at build time with
  // byte-identical behaviour. Errors are folded into `output` rather than posted as
  // `type: 'error'`, which is reserved for failures that produced no run at all.
  const output = await executeRun(req.code, {
    language: req.language,
    input: req.input,
    seed: req.seed,
    maxSteps: req.maxSteps,
    maxMs: req.maxMs,
  });
  ctx.postMessage({ id: req.id, type: 'done', output } satisfies WorkerResponse);
}

/**
 * Runs the source once per size, reporting each as it lands so the dialog can draw
 * progressively. A size that throws or blows the step cap is reported as a failed point
 * rather than ending the sweep - one bad rung should cost a point, not the whole curve.
 */
async function measure(req: MeasureRequest): Promise<void> {
  try {
    const runner = runnerFor(req.language);
    await runner.ensure();
    for (const { n, input } of req.inputs) {
      ctx.postMessage({ id: req.id, type: 'point', point: await one(runner, req, n, input) } satisfies WorkerResponse);
    }
  } catch (e) {
    // Failing to even load the runtime is fatal for the sweep, but still has to complete
    // the request or the caller waits forever.
    ctx.postMessage({ id: req.id, type: 'error', message: String(e) } satisfies WorkerResponse);
  }
  ctx.postMessage({ id: req.id, type: 'measured' } satisfies WorkerResponse);
}

async function one(
  runner: ReturnType<typeof runnerFor>,
  req: MeasureRequest,
  n: number,
  input: unknown,
): Promise<GrowthPoint> {
  const rec = new Recorder({ maxSteps: req.maxSteps, maxMs: req.maxMs });
  const started = Date.now();
  try {
    const env: RunEnv = { rec, viz: new VizApi(rec, new Rng(req.seed)), rng: new Rng(req.seed), input };
    await runner.execute(env, req.code);
    rec.record();
    const out = collect(rec);
    return {
      n,
      steps: out.steps.length,
      bytes: out.mem.length ? out.mem[out.mem.length - 1] : 0,
      ok: out.ok,
      ...(out.error ? { error: out.error.message } : {}),
      ms: Date.now() - started,
    };
  } catch (e) {
    return { n, steps: rec.steps.length, bytes: 0, ok: false, error: String(e), ms: Date.now() - started };
  }
}
