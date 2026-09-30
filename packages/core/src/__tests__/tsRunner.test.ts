import { describe, expect, it } from 'vitest';
import { tsRunner } from '../languages/tsRunner';
import { Rng } from '../rng';
import { Recorder } from '../recorder';
import { VizApi } from '../viz/api';
import { collect, describeError, runCode } from '../run';

async function runTs(code: string, input: unknown) {
  const rec = new Recorder({ maxSteps: 20000, maxMs: 15000 });
  const rng = new Rng(42);
  try {
    await tsRunner.execute({ rec, viz: new VizApi(rec, rng), rng, input }, code);
    rec.record();
    return collect(rec);
  } catch (e) {
    return collect(rec, describeError(e));
  }
}

const TS = [
  'interface Point { x: number; y: number }', // 1
  'const pts: Point[] = [{ x: 3, y: 1 }, { x: 1, y: 2 }];', // 2
  'const a = viz.array(pts.map((p: Point): number => p.x));', // 3
  'a.swap(0, 1);', // 4
  'viz.metric("total", (pts[0] as Point).x);', // 5
].join('\n');

describe('typescript runner', () => {
  it('strips the type layer and produces the same world as the JS equivalent', async () => {
    const out = await runTs(TS, {});
    expect(out.error?.message ?? '').toBe('');
    expect(out.ok).toBe(true);

    const js = runCode('const a = viz.array([3, 1]);\na.swap(0, 1);\nviz.metric("total", 3);', {}, { maxSteps: 20000 }, 42);
    expect(out.world).toEqual(js.world);
    expect(out.steps.length).toBe(js.steps.length);
  });

  it('is line preserving, so the executing-line highlight still lines up', async () => {
    const out = await runTs(TS, {});
    // The transform must not reflow lines, otherwise the line the recorder reports
    // would point at the wrong statement in the source the user is reading. Line 3
    // registers the first struct, and registering it deliberately records no step.
    expect(out.steps.map((s) => s.l)).toEqual([4, 5]);
  });

  it('reports the line of a throwing statement', async () => {
    const out = await runTs('const a: number[] = [1];\nthrow new Error("boom");', {});
    expect(out.ok).toBe(false);
    expect(out.error?.line).toBe(2);
  });

  it('keeps the steps recorded before the throw', async () => {
    const out = await runTs('const a = viz.array([1, 2]);\na.swap(0, 1);\nthrow new Error("boom");', {});
    expect(out.ok).toBe(false);
    expect(out.steps.length).toBeGreaterThan(0);
  });
});
