import { describe, expect, it } from 'vitest';
import { materializeAt } from '../materialize';
import { runCode } from '../run';

const bubbleSort = `
const a = viz.array(input.arr);
for (let i = 0; i < a.length; i++) {
  for (let j = 0; j < a.length - 1 - i; j++) {
    if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
  }
  a.mark(a.length - 1 - i, 'sorted');
}
viz.step('sorted');
`;

describe('runCode', () => {
  it('runs bubble sort and records steps', () => {
    const out = runCode(bubbleSort, { arr: [5, 3, 8, 1] });
    expect(out.ok).toBe(true);
    expect(out.steps.length).toBeGreaterThan(5);
    const arr = out.world.structs['arr0'] as unknown as { values: number[] };
    expect(arr.values).toEqual([1, 3, 5, 8]);
  });

  it('replaying steps reproduces the final world exactly', () => {
    const out = runCode(bubbleSort, { arr: [9, 7, 8, 2, 5, 1] });
    const replayed = materializeAt(out.keyframes, out.steps, out.steps.length);
    expect(replayed).toEqual(out.world);
  });

  it('materializes intermediate states at every keyframe boundary', () => {
    const out = runCode(bubbleSort, { arr: [4, 2, 7, 1] });
    for (const kf of out.keyframes) {
      const w = materializeAt(out.keyframes, out.steps, kf.i);
      expect(w).toEqual(kf.w);
    }
  });

  it('captures user errors with line numbers', () => {
    const out = runCode('viz.note("start");\nthrow new Error("boom");', {});
    expect(out.ok).toBe(false);
    expect(out.error?.message).toBe('boom');
    expect(out.error?.line).toBe(2);
  });

  it('enforces the step cap', () => {
    const out = runCode('while (true) viz.step("x");', {}, { maxSteps: 100, maxMs: 5000 });
    expect(out.ok).toBe(false);
    expect(out.error?.message).toMatch(/Step limit/);
    expect(out.steps.length).toBe(100);
  });

  it('captures console.log into world logs', () => {
    const out = runCode('console.log("hello", 1);\nconst a = viz.array([1]);', {});
    expect(out.ok).toBe(true);
    expect(out.world.logs).toContain('hello 1');
  });
});

const multiStruct = `
const rows = ['P1', 'P2'];
const first = viz.gantt(rows, 'first');
first.bar('P1', 0, 2, 'range1', 'P1');
first.bar('P2', 2, 5, 'range2', 'P2');
const second = viz.gantt(rows, 'second');
second.bar('P1', 0, 4, 'range1', 'P1');
const third = viz.array([1, 2, 3], 'values');
third.swap(0, 2);
`;

describe('patch snapshots', () => {
  it('records structs registered mid-run and never replays a dangling order entry', () => {
    const out = runCode(multiStruct, {});
    expect(out.ok).toBe(true);
    expect(out.world.order).toHaveLength(3);
    expect(out.world.order.map((id) => out.world.structs[id].type)).toEqual(['gantt', 'gantt', 'array']);
    for (let i = 0; i <= out.steps.length; i++) {
      const w = materializeAt(out.keyframes, out.steps, i);
      for (const id of w.order) {
        expect(w.structs[id], `step ${i} order references missing struct ${id}`).toBeDefined();
      }
    }
  });

  it('treats every patch value as a snapshot rather than a live reference', () => {
    const out = runCode(multiStruct, {});
    const firstOrderPatch = out.steps.find((s) => s.p.some((p) => p.p.join('.') === 'order'));
    expect(firstOrderPatch).toBeDefined();
    const orderPatch = firstOrderPatch!.p.find((p) => p.p.join('.') === 'order')!;
    expect((orderPatch.v as string[]).length).toBeLessThan(out.world.order.length);
  });

  it('replays each step of a multi-structure run to the recorded world', () => {
    const out = runCode(multiStruct, {});
    expect(materializeAt(out.keyframes, out.steps, out.steps.length)).toEqual(out.world);
    for (const kf of out.keyframes) {
      expect(materializeAt(out.keyframes, out.steps, kf.i)).toEqual(kf.w);
    }
  });
});
