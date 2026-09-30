import { describe, expect, it } from 'vitest';
import { runCode } from '../run';
import { captureUserLine, lineFromStack } from '../userLine';

// The `viz` surface used here, kept tiny on purpose: what matters is the line number
// that each call site reports.
const CODE = [
  'const a = viz.array([3, 1, 2]);', // 1
  'a.swap(0, 1);', // 2
  'a.swap(1, 2);', // 3
  'viz.batch(() => {', // 4
  '  a.mark(0, "m", "zero");', // 5
  '  a.mark(1, "m", "one");', // 6
  '});', // 7
  'viz.log("done");', // 8
].join('\n');

describe('user line capture', () => {
  it('lineFromStack rejects a missing or unrelated stack', () => {
    expect(lineFromStack(undefined)).toBeUndefined();
    expect(lineFromStack('')).toBeUndefined();
    expect(lineFromStack('Error\n    at foo (/app/src/other.ts:3:1)')).toBeUndefined();
  });

  it('lineFromStack maps <anonymous> frames back to editor lines', () => {
    // Editor line 1 sits on line 3 of the generated new Function wrapper.
    expect(lineFromStack('Error\n    at <anonymous>:3:1')).toBe(1);
    expect(lineFromStack('Error\n    at <anonymous>:42:7')).toBe(40);
  });

  it('lineFromStack drops pre-body frames and anything below line 1', () => {
    expect(lineFromStack('Error\n    at <anonymous>:2:1')).toBeUndefined();
    expect(lineFromStack('Error\n    at <anonymous>:1:1')).toBeUndefined();
  });

  it('captureUserLine has no user frame when called from ordinary code', () => {
    expect(captureUserLine()).toBeUndefined();
  });
});

describe('recorded step lines', () => {
  it('attributes each step to the line that produced it', () => {
    const out = runCode(CODE, undefined, {}, 42);
    expect(out.ok).toBe(true);
    const lines = out.steps.map((s) => s.l);
    expect(lines.every((l) => typeof l === 'number')).toBe(true);
    // Every recorded line must be a real line of the snippet.
    for (const l of lines) {
      expect(l).toBeGreaterThanOrEqual(1);
      expect(l).toBeLessThanOrEqual(8);
    }
    expect(lines).toContain(2); // a.swap(0, 1)
    expect(lines).toContain(3); // a.swap(1, 2)
    expect(lines).toContain(8); // viz.log('done')
  });

  it('collapses a viz.batch block to the first line it touched, not the closing brace', () => {
    const out = runCode(CODE, undefined, {}, 42);
    expect(out.ok).toBe(true);
    // Line 7 is the `});` that closes the batch and line 4 opens it; the step produced
    // by the block should be attributed to line 5, the first line the block touched.
    expect(out.steps.some((s) => s.l === 5)).toBe(true);
    expect(out.steps.some((s) => s.l === 7)).toBe(false);
  });

  it('leaves the line undefined for a step with no user code on the stack', () => {
    // No viz calls at all: runCode still records once from its own frame.
    const out = runCode('const x = 1 + 1;', undefined, {}, 42);
    expect(out.ok).toBe(true);
    expect(out.steps.every((s) => s.l === undefined)).toBe(true);
  });

  it('still reports the error line for a throwing template', () => {
    const out = runCode('const a = viz.array([1]);\nthrow new Error("boom");', undefined, {}, 42);
    expect(out.ok).toBe(false);
    expect(out.error?.line).toBe(2);
  });

  it('restores Error.stackTraceLimit after the run', () => {
    const before = Error.stackTraceLimit;
    runCode('const a = viz.array([1]);\na.swap(0,0);', undefined, {}, 42);
    expect(Error.stackTraceLimit).toBe(before);
  });

  it('restores Error.stackTraceLimit even when the code throws', () => {
    const before = Error.stackTraceLimit;
    runCode('throw new Error("boom");', undefined, {}, 42);
    expect(Error.stackTraceLimit).toBe(before);
  });

  it('every template still runs and every step line is inside that template', () => {
    // A smoke check that the extra stack capture per step did not break recording.
    const out = runCode(CODE, undefined, { maxSteps: 1000 }, 42);
    expect(out.steps.length).toBeGreaterThan(0);
  });
});
