import { executeRun, type RunOutput } from '@algoplot/core';
import { parseFence } from './fence';

export interface AlgoplotRemarkOptions {
  /**
   * `'jsx'` (default) emits an `<AlgoPlayer>` MDX component node whose `data` prop is
   * the recording as an object expression — an MDX pipeline, with `AlgoPlayer` in
   * scope of the page (import it, or map it through MDXProvider).
   * `'html'` emits `<algoplot-player data-payload="…">` markup for the custom
   * element in `@algoplot/web` to hydrate — plain markdown pipelines, where MDX
   * nodes would not render at all.
   */
  mode?: 'jsx' | 'html';
  /**
   * jsx mode only: a valueless attribute added to the emitted component, for hosts
   * that hydrate by directive — Astro's `client:load` / `client:visible`. Unknown
   * props are ignored by the component, so a host that does not understand it loses
   * nothing but interactivity.
   */
  client?: string;
  /** Budget fallbacks; a fence's own options object wins over these. */
  maxSteps?: number;
  maxMs?: number;
  seed?: number;
}

/** The slice of VFile the plugin uses; typed structurally so no vfile type leaks into the dts. */
interface BuildFile {
  fail(message: string, node?: unknown): never;
}

interface NodeLike {
  type: string;
  children?: NodeLike[];
  lang?: string | null;
  meta?: string | null;
  value?: string;
  /** MDX component nodes carry these two; plain mdast nodes never do. */
  name?: string;
  attributes?: unknown[];
}

interface CodeRef {
  node: NodeLike;
  parent: NodeLike;
  index: number;
}

/**
 * Collect every `code` node with its parent slot. A walk of our own rather than
 * unist-util-visit: the transformer operates on mdast-or-mdx trees whose node unions
 * differ, so visit's generics would buy casts rather than safety — and children are
 * arrays on every mdast parent, which is all this needs to know.
 */
function collectCodeNodes(node: NodeLike, out: CodeRef[]): void {
  const children = node.children;
  if (!children) return;
  children.forEach((child, i) => {
    if (child.type === 'code') out.push({ node: child, parent: node, index: i });
    collectCodeNodes(child, out);
  });
}

function escapeAttr(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsxNode(payload: RunOutput, client?: string): NodeLike {
  // The payload is embedded as an *expression* — JSON is valid expression syntax — so
  // it reaches the component as an object with no parse step in the reader's browser.
  return {
    type: 'mdxJsxFlowElement',
    name: 'AlgoPlayer',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'data',
        value: {
          type: 'mdxJsxAttributeValueExpression',
          value: JSON.stringify(payload),
        },
      },
      ...(client ? [{ type: 'mdxJsxAttribute', name: client, value: null }] : []),
    ],
    children: [],
  };
}

function htmlNode(payload: RunOutput): NodeLike {
  // The browser unescapes attribute values on parse, so the element reads the JSON
  // back verbatim from getAttribute; the escaping above is for the document only.
  return {
    type: 'html',
    value: `<algoplot-player data-payload="${escapeAttr(JSON.stringify(payload))}"></algoplot-player>`,
  };
}

export default function remarkAlgoplot(options: AlgoplotRemarkOptions = {}) {
  const mode = options.mode ?? 'jsx';

  return async function transformer(tree: unknown, file: unknown): Promise<void> {
    const vfile = file as BuildFile;
    const fences: CodeRef[] = [];
    collectCodeNodes(tree as NodeLike, fences);

    // Serial on purpose: runs share registered runners, and Python shares one Pyodide
    // instance whose per-run globals cannot be interleaved. The position of a fence in
    // the document decides nothing about the others, so order alone is enough.
    for (const ref of fences) {
      if (ref.node.lang !== 'algoplot') continue;
      ref.parent.children![ref.index] = await build(ref, options, mode, vfile);
    }
  };
}

async function build(
  ref: CodeRef,
  options: AlgoplotRemarkOptions,
  mode: 'jsx' | 'html',
  file: BuildFile,
): Promise<NodeLike> {
  let meta: Awaited<ReturnType<typeof parseFence>>;
  let output: RunOutput;
  try {
    meta = parseFence(ref.node.meta);
    output = await executeRun(ref.node.value ?? '', {
      language: meta.language,
      input: meta.input,
      seed: meta.seed ?? options.seed,
      maxSteps: meta.maxSteps ?? options.maxSteps,
      maxMs: meta.maxMs ?? options.maxMs,
    });
  } catch (e) {
    // parse/validation errors, and runnerFor's "Python support is not installed"
    return file.fail(`\`\`\`algoplot fence: ${(e as Error).message}`, ref.node);
  }
  if (!output.ok) {
    // A fence that cannot run is a broken page, not a page with an error box: the
    // reader of the rendered doc never sees a build log, so the build is the place
    // this has to be loud. Not re-wrapped by the catch above, so the fence's own
    // wording (`fence failed (line N): …`) is the message the author sees.
    const at = output.error?.line !== undefined ? ` (line ${output.error.line})` : '';
    return file.fail(
      `\`\`\`algoplot ${meta.language} fence failed${at}: ${output.error?.message ?? 'unknown error'}`,
      ref.node,
    );
  }
  return mode === 'html' ? htmlNode(output) : jsxNode(output, options.client);
}

export { parseFence } from './fence';
export type { FenceMeta } from './fence';
