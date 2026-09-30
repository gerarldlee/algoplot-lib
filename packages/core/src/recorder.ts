import { cloneWorld, diffWorlds } from './diff';
import { bytesOf } from './size';
import { captureUserLine } from './userLine';
import type { Patch, Step, World } from './types';
import { emptyWorld } from './types';

export class RunLimitError extends Error {}

export interface RecorderOptions {
  maxSteps?: number;
  maxMs?: number;
  keyframeEvery?: number;
}

export class Recorder {
  world: World = emptyWorld();
  steps: Step[] = [];
  keyframes: { i: number; w: World }[] = [];
  /**
   * Cumulative estimated retained bytes, one entry per step (index i covers steps[0..i-1]).
   * The stair-step shape is real: patches accumulate one step at a time and every
   * keyframe adds a whole world clone on top.
   */
  mem: number[] = [0];
  /** Step index at which each `world.logs` entry was appended, for click-to-jump. */
  logSteps: number[] = [];
  maxSteps: number;
  maxMs: number;
  keyframeEvery: number;
  private bytes = 0;
  private loggedSoFar = 0;
  private prev: World = emptyWorld();
  private pendingNote?: string;
  private batchDepth = 0;
  /** First user line touched inside the open viz.batch() block, if any. */
  private batchLine: number | undefined;
  /** Line pushed in by a non-JS runtime (see setBridgeLine) for the next step. */
  private bridgeLine: number | undefined;
  private started: number;

  constructor(opts: RecorderOptions = {}) {
    this.maxSteps = opts.maxSteps ?? 10000;
    this.maxMs = opts.maxMs ?? 4000;
    this.keyframeEvery = opts.keyframeEvery ?? 200;
    this.started = Date.now();
    this.keyframes.push({ i: 0, w: cloneWorld(this.world) });
  }

  register(id: string, data: Record<string, unknown>): void {
    this.world.structs[id] = data as World['structs'][string];
    this.world.order.push(id);
    if (this.steps.length === 0) {
      this.prev = cloneWorld(this.world);
      this.keyframes[0] = { i: 0, w: cloneWorld(this.world) };
    } else {
      this.record();
    }
  }

  note(msg: string): void {
    this.pendingNote = msg;
  }

  step(msg?: string): void {
    this.record(msg);
  }

  metric(name: string, value: string | number): void {
    this.world.metrics[name] = value;
    this.record();
  }

  log(msg: string): void {
    this.world.logs.push(msg);
    this.record();
  }

  enterBatch(): void {
    this.batchDepth++;
  }

  exitBatch(): void {
    this.batchDepth--;
    if (this.batchDepth === 0) this.record();
  }

  batch<T>(fn: () => T): T {
    this.enterBatch();
    try {
      return fn();
    } finally {
      this.exitBatch();
    }
  }

  /**
   * Non-JS runtimes cannot produce a JavaScript stack, so they report the executing
   * line through this channel instead. It is consumed by the next recorded step and
   * takes priority over the JS stack capture, which would be meaningless for them.
   */
  setBridgeLine(line: number | undefined): void {
    this.bridgeLine = line;
  }

  record(msg?: string): void {
    if (this.batchDepth > 0) {
      // Nothing is recorded until the block closes, so remember the first line it
      // touched - otherwise the single step for the block would be attributed to the
      // closing `})` line.
      if (this.batchLine === undefined) this.batchLine = this.bridgeLine ?? captureUserLine();
      this.bridgeLine = undefined;
      return;
    }
    this.checkLimits();
    const m = msg ?? this.pendingNote;
    this.pendingNote = undefined;
    const patches: Patch[] = diffWorlds(this.prev, this.world);
    if (patches.length === 0 && m === undefined) {
      // A batch that changed nothing must not leak its line onto the next step.
      this.batchLine = undefined;
      this.bridgeLine = undefined;
      return;
    }
    const l = this.batchLine ?? this.bridgeLine ?? captureUserLine();
    this.batchLine = undefined;
    this.bridgeLine = undefined;
    const step: Step = { p: patches, l };
    if (m !== undefined) step.m = m;
    this.steps.push(step);
    // Attribute log lines to the step that recorded them. Counting them here rather than in
    // log() is what makes a log inside viz.batch() work: that log has no step of its own,
    // and the step only appears when the batch closes.
    for (let i = this.loggedSoFar; i < this.world.logs.length; i++) {
      this.logSteps.push(this.steps.length - 1);
    }
    this.loggedSoFar = this.world.logs.length;
    this.bytes += bytesOf(patches);
    this.mem.push(this.bytes);
    this.prev = cloneWorld(this.world);
    if (this.steps.length % this.keyframeEvery === 0) {
      const kf = cloneWorld(this.world);
      this.keyframes.push({ i: this.steps.length, w: kf });
      // A keyframe is a second full copy of the world, and it lands on top of the step
      // just recorded - so charge it to the same entry rather than inventing a step.
      this.bytes += bytesOf(kf);
      this.mem[this.mem.length - 1] = this.bytes;
    }
  }

  checkLimits(): void {
    if (this.steps.length >= this.maxSteps) {
      throw new RunLimitError(
        `Step limit of ${this.maxSteps} exceeded. Recording stops here so a run cannot grow without bound.`,
      );
    }
    if ((this.steps.length & 63) === 0 && Date.now() - this.started > this.maxMs) {
      throw new RunLimitError(`Execution timed out after ${this.maxMs}ms. The code may be in an infinite loop.`);
    }
  }
}
