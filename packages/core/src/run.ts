import { Recorder, type RecorderOptions, RunLimitError } from './recorder';
import { Rng } from './rng';
import type { Step, World } from './types';
import { VizApi } from './viz/api';
import { lineFromStack } from './userLine';
import type { RunEnv } from './languages/types';

export type { RunEnv };

export interface RunOutput {
  ok: boolean;
  steps: Step[];
  world: World;
  keyframes: { i: number; w: World }[];
  /** Cumulative estimated retained bytes, one entry per step. Drives the memory graph. */
  mem: number[];
  /** Step index at which each `world.logs` entry appeared, for click-to-jump. */
  logSteps: number[];
  error?: { message: string; line?: number };
}

function consoleShim(rec: Recorder) {
  const fmt = (args: unknown[]) =>
    args
      .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : JSON.stringify(a)))
      .join(' ');
  return {
    log: (...args: unknown[]) => rec.log(fmt(args)),
    warn: (...args: unknown[]) => rec.log(`[warn] ${fmt(args)}`),
    error: (...args: unknown[]) => rec.log(`[error] ${fmt(args)}`),
    info: (...args: unknown[]) => rec.log(fmt(args)),
  };
}

export function runCode(code: string, input: unknown, opts: RecorderOptions = {}, seed = 42): RunOutput {
  const rec = new Recorder(opts);
  const rng = new Rng(seed);
  const viz = new VizApi(rec, rng);
  // The recorder captures a stack per step to learn the executing line. Only the
  // innermost frames matter (record -> viz api -> user code), so tighten the limit for
  // the run - ~5.6us per capture instead of ~9.6us - and restore it afterwards. Error
  // stacks are stringified at construction, so the shorter limit still leaves the user
  // frame that the error report below needs.
  const prevStackLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 5;
  try {
    execJs({ rec, viz, rng, input }, code);
    rec.record();
    return collect(rec);
  } catch (e) {
    return collect(rec, describeError(e));
  } finally {
    Error.stackTraceLimit = prevStackLimit;
  }
}

/** The JavaScript execution strategy: compile and call the source directly. */
export function execJs(env: RunEnv, code: string): void {
  const fn = new Function('viz', 'input', 'console', code);
  fn(env.viz, env.input, consoleShim(env.rec));
}

/** Snapshot a finished recorder into the shape the worker sends back. */
export function collect(rec: Recorder, error?: { message: string; line?: number }): RunOutput {
  return {
    ok: error === undefined,
    steps: rec.steps,
    world: rec.world,
    keyframes: rec.keyframes,
    mem: rec.mem,
    logSteps: rec.logSteps,
    ...(error ? { error } : {}),
  };
}

/** Turn a thrown value into a reportable error, or undefined when the run is still valid. */
export function describeError(e: unknown): { message: string; line?: number } | undefined {
  if (e instanceof RunLimitError) return { message: e.message };
  const err = e as Error;
  const message = err instanceof SyntaxError ? `${err.message}` : (err.message ?? String(e));
  // A runner that knows the offending line without a JS stack (Pyodide reports it from
  // the traceback) attaches `line` to the error itself; the stack answer wins when both
  // exist, which is the same precedence the worker used to apply by importing PyodideError.
  const fromStack = lineFromStack(err.stack);
  const own = (err as { line?: unknown }).line;
  const line = fromStack ?? (typeof own === 'number' ? own : undefined);
  return { message, line };
}
