import { describe, expect, it } from 'vitest';
import { remark } from 'remark';
import { VFile } from 'vfile';
// Importing the package is the whole setup: it registers the `py` runner in this
// realm, which is exactly what a docs build does to enable python fences.
import '@algoplot/python';
import remarkAlgoplot from '../index';

const processor = remark();

// Boots Pyodide (the npm package, through the runner's Node auto-loader) — slow, and
// deliberately not in the main suite: a machine without the optional dependency should
// fail here with the runner's own install hint, not in every fence test.
describe('remarkAlgoplot python fences', () => {
  it(
    'executes python through Pyodide and ships the recording',
    async () => {
      const md = '```algoplot python {"input":{"arr":[3,1,2]}}\n' +
        'a = viz.array(input["arr"])\n' +
        'viz.step("made")\n' +
        '```\n';
      const tree = processor.parse(md) as unknown as { children: unknown[] };
      const file = new VFile({ path: 'test.md', value: md });
      await remarkAlgoplot()(tree, file);

      const node = JSON.stringify(tree).includes('mdxJsxFlowElement')
        ? (tree as { children: { type: string; attributes?: { name: string; value?: { value?: string } }[] }[] })
            .children[0]
        : undefined;
      expect(node?.type).toBe('mdxJsxFlowElement');
      const expr = node!.attributes!.find((a) => a.name === 'data')!.value!.value!;
      const payload = JSON.parse(expr) as {
        ok: boolean;
        error?: { message: string };
        steps: unknown[];
        world: { structs: Record<string, { values: number[] }> };
      };
      expect(payload.error?.message ?? '').not.toContain('not installed');
      expect(payload.ok).toBe(true);
      expect(payload.steps.length).toBeGreaterThanOrEqual(1);
      expect(Object.values(payload.world.structs)[0].values).toEqual([3, 1, 2]);
    },
    180_000,
  );
});
