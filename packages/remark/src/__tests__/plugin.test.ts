import { describe, expect, it } from 'vitest';
import { remark } from 'remark';
import { VFile } from 'vfile';
import remarkAlgoplot from '../index';

interface Attr {
  type?: string;
  name?: string;
  value?: { type?: string; value?: string } | string;
}
interface AnyNode {
  type: string;
  children?: AnyNode[];
  lang?: string | null;
  meta?: string | null;
  value?: string;
  name?: string;
  attributes?: Attr[];
}

const processor = remark();

async function transform(md: string, options: Parameters<typeof remarkAlgoplot>[0] = {}) {
  const tree = processor.parse(md) as unknown as AnyNode;
  const file = new VFile({ path: 'test.md', value: md });
  await remarkAlgoplot(options)(tree, file);
  return tree;
}

function find(node: AnyNode, type: string): AnyNode | undefined {
  if (node.type === type) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, type);
    if (hit) return hit;
  }
  return undefined;
}

function payloadOf(node: AnyNode): Record<string, unknown> {
  const attr = node.attributes?.find((a) => a.name === 'data');
  const expr = attr?.value;
  expect(typeof expr).toBe('object');
  const text = (expr as { value: string }).value;
  return JSON.parse(text) as Record<string, unknown>;
}

function unescapeAttr(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

const SORT = `const a = viz.array(input.arr);
for (let i = 0; i < a.length; i++) {
  for (let j = 0; j < a.length - 1 - i; j++) {
    if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
  }
}
viz.step('sorted');`;

const SORT_OPTIONS = '{"input":{"arr":[5,3,8,1]}}';

describe('remarkAlgoplot (jsx mode)', () => {
  it('turns an ```algoplot fence into an <AlgoPlayer> node carrying the recording', async () => {
    const md = '```algoplot js ' + SORT_OPTIONS + '\n' + SORT + '\n```\n';
    const tree = await transform(md);
    const node = find(tree, 'mdxJsxFlowElement');
    expect(node).toBeDefined();
    expect(node!.name).toBe('AlgoPlayer');
    const payload = payloadOf(node!);
    expect(payload.ok).toBe(true);
    expect((payload.steps as unknown[]).length).toBeGreaterThan(3);
    const world = payload.world as { structs: Record<string, { values: number[] }> };
    expect(Object.values(world.structs)[0].values).toEqual([1, 3, 5, 8]);
  });

  it('passes the fence input through to the run', async () => {
    const md = '```algoplot js {"input":{"arr":[9,7,8]}}\n' + SORT + '\n```\n';
    const payload = payloadOf(find((await transform(md)), 'mdxJsxFlowElement')!);
    const world = payload.world as { structs: Record<string, { values: number[] }> };
    expect(Object.values(world.structs)[0].values).toEqual([7, 8, 9]);
  });

  it('leaves ordinary fences alone', async () => {
    const tree = await transform('```js\nconst x = 1;\n```\n');
    expect(find(tree, 'mdxJsxFlowElement')).toBeUndefined();
    expect(find(tree, 'code')).toBeDefined();
  });

  it('accepts a TypeScript fence', async () => {
    const md = '```algoplot ts\nconst x: number = 4;\nviz.array([x, 1]);\n```\n';
    const payload = payloadOf(find(await transform(md), 'mdxJsxFlowElement')!);
    expect(payload.ok).toBe(true);
  });

  it('adds the host hydration attribute when asked', async () => {
    const md = '```algoplot js\nviz.array([1]);\n```\n';
    const node = find(await transform(md, { client: 'client:load' }), 'mdxJsxFlowElement')!;
    expect(node.attributes!.some((a) => a.name === 'client:load')).toBe(true);
    // default: no directive attribute
    const plain = find(await transform(md), 'mdxJsxFlowElement')!;
    expect(plain.attributes!.some((a) => a.name === 'client:load')).toBe(false);
  });

  it('fails the build when the code throws, naming the fence line', async () => {
    await expect(
      transform('```algoplot js\nthrow new Error("boom");\n```\n'),
    ).rejects.toThrow(/fence failed \(line 1\): boom/);
  });

  it('fails the build when the step budget is exceeded', async () => {
    await expect(
      transform('```algoplot js {"maxSteps":5}\nwhile (true) viz.step("x");\n```\n'),
    ).rejects.toThrow(/Step limit/);
  });

  it('rejects an unknown fence language', async () => {
    await expect(transform('```algoplot ruby\nputs 1\n```\n')).rejects.toThrow(
      /unknown language 'ruby'/,
    );
  });

  it('rejects malformed options with the parser message', async () => {
    await expect(transform('```algoplot js {not json}\ncode\n```\n')).rejects.toThrow(
      /invalid options JSON/,
    );
  });

  it('rejects an unknown option rather than ignoring it', async () => {
    await expect(transform('```algoplot js {"imput":{}}\ncode\n```\n')).rejects.toThrow(
      /unknown option 'imput'/,
    );
  });

  it('rejects options that are not an object', async () => {
    await expect(transform('```algoplot js [1,2]\ncode\n```\n')).rejects.toThrow(
      /must be a JSON object/,
    );
  });

  it('rejects a non-numeric budget', async () => {
    await expect(transform('```algoplot js {"maxSteps":"many"}\ncode\n```\n')).rejects.toThrow(
      /'maxSteps' must be a finite number/,
    );
  });
});

describe('remarkAlgoplot (html mode)', () => {
  it('emits an <algoplot-player> element whose payload round-trips through attributes', async () => {
    const md = '```algoplot js ' + SORT_OPTIONS + '\n' + SORT + '\n```\n';
    const tree = await transform(md, { mode: 'html' });
    const node = find(tree, 'html');
    expect(node).toBeDefined();
    expect(node!.value).toMatch(/^<algoplot-player data-payload="/);
    expect(node!.value).toMatch(/"><\/algoplot-player>$/);
    const json = /data-payload="([\s\S]*)"><\/algoplot-player>/.exec(node!.value!)![1];
    const payload = JSON.parse(unescapeAttr(json)) as { ok: boolean; steps: unknown[] };
    expect(payload.ok).toBe(true);
    expect(payload.steps.length).toBeGreaterThan(3);
  });
});
