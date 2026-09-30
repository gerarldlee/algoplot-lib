import type { RunOutput } from '../run';
import type { GrowthPoint } from '../complexity';
import type { LanguageId } from '../languages/registry';
import { LANGUAGES } from '../languages/registry';
import type { MeasureRequest, RunRequest, WorkerResponse } from '../worker/protocol';

export interface RunParams {
  code: string;
  input: unknown;
  maxSteps: number;
  maxMs: number;
  seed: number;
  language?: LanguageId;
}

export interface MeasureParams {
  code: string;
  inputs: { n: number; input: unknown }[];
  maxSteps: number;
  maxMs: number;
  seed: number;
  language?: LanguageId;
  onPoint?(p: GrowthPoint): void;
}

/** Wall clock for a compiled run to be killed. */
const HARD_TIMEOUT_MS = 15000;
/**
 * A cold Python start has to download and boot the interpreter, which can take several
 * seconds before the run itself even begins, so that path gets a longer leash.
 */
const RUNTIME_LOAD_GRACE_MS = 60000;

function timeoutFor(language: LanguageId | undefined): number {
  return language === 'py' ? HARD_TIMEOUT_MS + RUNTIME_LOAD_GRACE_MS : HARD_TIMEOUT_MS;
}

export interface WorkerRunnerOptions {
  /**
   * How to spawn the worker. Defaults to the worker Vite emits alongside this module
   * (`new URL('../worker/runner.worker.ts', import.meta.url)` — rewritten to a relative
   * asset path in the built package). Pass your own factory to host the worker
   * elsewhere, or to run a bundle with extra runners registered, e.g.
   * `() => new Worker(new URL('@algoplot/python/worker', import.meta.url), { type: 'module' })`
   * for Python support at run time.
   */
  createWorker?: () => Worker;
}

export class WorkerRunner {
  private readonly spawn: () => Worker;
  private worker: Worker | null = null;
  private id = 0;
  private pending = new Map<
    number,
    { resolve: (o: RunOutput) => void; reject: (e: Error) => void; timer: number }
  >();
  /** In-flight sweeps, which stream several messages per request rather than one. */
  private sweeps = new Map<
    number,
    {
      onPoint?: (p: GrowthPoint) => void;
      points: GrowthPoint[];
      resolve: (p: GrowthPoint[]) => void;
      reject: (e: Error) => void;
      timer: number;
    }
  >();

  constructor(options: WorkerRunnerOptions = {}) {
    this.spawn =
      options.createWorker ??
      (() => new Worker(new URL('../worker/runner.worker.ts', import.meta.url), { type: 'module' }));
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = this.spawn();
    w.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const msg = ev.data;
      const sweep = this.sweeps.get(msg.id);
      if (sweep) {
        if (msg.type === 'point') {
          sweep.points.push(msg.point);
          sweep.onPoint?.(msg.point);
        } else if (msg.type === 'measured') {
          clearTimeout(sweep.timer);
          this.sweeps.delete(msg.id);
          sweep.resolve(sweep.points);
        } else if (msg.type === 'error') {
          clearTimeout(sweep.timer);
          this.sweeps.delete(msg.id);
          sweep.reject(new Error(msg.message));
        }
        return;
      }
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(msg.id);
      if (msg.type === 'done') entry.resolve(msg.output);
      else if (msg.type === 'error') entry.reject(new Error(msg.message));
    };
    w.onerror = (ev) => {
      const err = new Error(ev.message || 'worker error');
      for (const [, entry] of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(err);
      }
      this.pending.clear();
      for (const [, sweep] of this.sweeps) {
        clearTimeout(sweep.timer);
        sweep.reject(err);
      }
      this.sweeps.clear();
      this.recycle();
    };
    this.worker = w;
    return w;
  }

  private recycle(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  run(params: RunParams): Promise<RunOutput> {
    const w = this.ensureWorker();
    const id = ++this.id;
    const language = params.language ?? 'js';
    const req: RunRequest = { id, ...params, language };
    const limit = timeoutFor(language);
    return new Promise<RunOutput>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        this.recycle();
        reject(
          new Error(
            `Execution was killed after ${limit / 1000}s — likely an infinite loop.` +
              (language === 'py' ? ' (Python is slower per step; the grace period includes runtime start-up.)' : ''),
          ),
        );
      }, limit);
      this.pending.set(id, { resolve, reject, timer });
      w.postMessage(req);
    });
  }

  /**
   * Budgets a run should use when the caller has no preference.
   */
  static defaultsFor(language: LanguageId | undefined): { maxSteps: number; maxMs: number } {
    return LANGUAGES[language ?? 'js'].defaults;
  }

  /**
   * Runs the source once per size and returns the points in order. The worker serialises
   * requests, so a sweep monopolises it for its duration - the caller is responsible for
   * not asking for a compile at the same time. The timeout covers the whole sweep.
   */
  measure(params: MeasureParams): Promise<GrowthPoint[]> {
    const w = this.ensureWorker();
    const id = ++this.id;
    const language = params.language ?? 'js';
    const req: MeasureRequest = { id, language, ...params };
    const limit = timeoutFor(language) + params.maxMs * params.inputs.length;
    return new Promise<GrowthPoint[]>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.sweeps.delete(id);
        this.recycle();
        reject(new Error(`The growth sweep was killed after ${Math.round(limit / 1000)}s.`));
      }, limit);
      this.sweeps.set(id, { onPoint: params.onPoint, points: [], resolve, reject, timer });
      w.postMessage(req);
    });
  }

  /** True while a sweep holds the worker, so the UI can stop offering Compile. */
  get busy(): boolean {
    return this.sweeps.size > 0;
  }

  dispose(): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error('disposed'));
    }
    this.pending.clear();
    for (const [, sweep] of this.sweeps) {
      clearTimeout(sweep.timer);
      sweep.reject(new Error('disposed'));
    }
    this.sweeps.clear();
    this.recycle();
  }
}
