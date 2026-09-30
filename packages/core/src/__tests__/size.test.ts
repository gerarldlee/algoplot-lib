import { describe, expect, it } from 'vitest';
import { MEMORY_WARN_BYTES, bytesOf, formatBytes } from '../size';
import { Recorder } from '../recorder';
import type { Patch } from '../types';

describe('bytesOf', () => {
  it('is zero for undefined, so an absent series is not counted as a cost', () => {
    expect(bytesOf(undefined)).toBe(0);
  });

  it('counts UTF-16 code units of the JSON form, quotes included', () => {
    // JSON.stringify('ab') is '"ab"': 4 code units, 8 bytes.
    expect(bytesOf('ab')).toBe(8);
    expect(bytesOf('abcd')).toBe(12);
  });

  it('is monotonic in the payload', () => {
    const small = bytesOf([{ p: ['a'], v: 1 }]);
    const big = bytesOf([{ p: ['a'], v: 1 }, { p: ['b'], v: 'xxxxxxxx' }]);
    expect(big).toBeGreaterThan(small);
  });

  it('returns zero rather than throwing on a value it cannot serialise', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(bytesOf(cyclic)).toBe(0);
  });
});

describe('formatBytes', () => {
  it('reads as a human-scaled figure', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(812)).toBe('812 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });
});

/** Mutate a struct the way a viz call would, then record, to drive a real diff. */
function step(rec: Recorder, i: number, width = 20): void {
  rec.world.structs.a = { type: 'array', values: Array.from({ length: width }, (_, k) => k + i) };
  if (rec.world.order.length === 0) rec.world.order.push('a');
  rec.record();
}

describe('recorder memory series', () => {
  it('starts at zero and has one entry per step, plus the origin', () => {
    const rec = new Recorder();
    step(rec, 0);
    step(rec, 1);
    expect(rec.mem.length).toBe(rec.steps.length + 1);
    expect(rec.mem[0]).toBe(0);
  });

  it('never decreases as patches accumulate', () => {
    const rec = new Recorder();
    for (let i = 0; i < 20; i++) step(rec, i);
    for (let i = 1; i < rec.mem.length; i++) {
      expect(rec.mem[i]).toBeGreaterThanOrEqual(rec.mem[i - 1]);
    }
    expect(rec.mem[rec.mem.length - 1]).toBeGreaterThan(0);
  });

  it('charges each keyframe a whole extra world, not just a step', () => {
    // A keyframe is a second full copy of the world, so the entry it lands on must jump by
    // more than an ordinary step's own patch cost.
    const rec = new Recorder({ keyframeEvery: 4 });
    for (let i = 0; i < 8; i++) step(rec, i);
    expect(rec.keyframes.length).toBeGreaterThan(1);
    const atKeyframe = rec.mem[4] - rec.mem[3];
    const atPlainStep = rec.mem[3] - rec.mem[2];
    expect(atKeyframe).toBeGreaterThan(atPlainStep);
  });

  it('stays within the warn threshold for a small recorded run', () => {
    const rec = new Recorder();
    step(rec, 0);
    expect(rec.mem[rec.mem.length - 1]).toBeLessThan(MEMORY_WARN_BYTES);
  });
});

describe('recorder log positions', () => {
  it('records the step index each log line was written at', () => {
    const rec = new Recorder();
    step(rec, 0);
    rec.log('first');
    step(rec, 1);
    rec.log('second');
    expect(rec.world.logs).toEqual(['first', 'second']);
    expect(rec.logSteps).toEqual([1, 3]);
    expect(rec.logSteps.every((i) => i < rec.steps.length)).toBe(true);
  });

  it('attributes a log inside a batch to the step that closes the batch', () => {
    // The log has no step of its own while the batch is open, so this is the case that
    // forced the attribution to live in record() rather than log().
    const rec = new Recorder();
    rec.batch(() => {
      rec.world.structs.a = { type: 'array', values: [1] };
      rec.log('inside');
      rec.world.structs.a = { type: 'array', values: [2] };
    });
    expect(rec.world.logs).toEqual(['inside']);
    expect(rec.logSteps).toEqual([0]);
    expect(rec.steps.length).toBe(1);
  });

  it('keeps one position per log line', () => {
    const rec = new Recorder();
    step(rec, 0);
    rec.log('a');
    rec.log('b');
    expect(rec.logSteps.length).toBe(2);
  });
});

describe('patch shape assumptions behind the estimate', () => {
  it('treats patch payloads as plain acyclic data, which is what makes JSON safe here', () => {
    const p: Patch = { p: ['structs', 'a', 'values', 0], v: [1, 2, 3] };
    expect(bytesOf([p])).toBeGreaterThan(0);
    expect(bytesOf([p])).toBe(bytesOf([{ ...p }]));
  });
});
