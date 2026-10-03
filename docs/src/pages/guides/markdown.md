---
title: Markdown
description: 'Mount live algoplot players onto ```algoplot fences in any rendered HTML — no build step required.'
layout: ../../layouts/Base.astro
---

# Markdown

`@algoplot/markdown` mounts live players onto ` ```algoplot ` code fences in any
markdown-rendered HTML. It is the runtime alternative to `@algoplot/remark` — use it
when you only have rendered HTML and cannot plug into the build pipeline.

```ts
import { mountAll } from '@algoplot/markdown';

const result = await mountAll(document.body);
```

## When to use this vs `@algoplot/remark`

| | `@algoplot/remark` | `@algoplot/markdown` |
| --- | --- | --- |
| When | Build time | Runtime |
| Input | mdast AST | Rendered HTML DOM |
| Output | JSX or HTML nodes | Live React components |
| React needed | No (downstream only) | Yes (peer dep) |

Use `@algoplot/remark` when you control the build pipeline (MDX, Astro, VitePress).
Use `@algoplot/markdown` when you only have rendered HTML — a CMS, a docs platform,
or any system where you cannot plug into the build.

## Fence format

The scanner looks for `pre > code.language-algoplot` elements. The fence body can
include an info string:

````md
```algoplot js {"input":{"arr":[3,1,2]}}
const a = viz.array(input.arr);
a.swap(0, 2);
viz.step('swapped');
```
````

The info string is parsed by `@algoplot/remark`'s `parseFence` — same strict options
(`input`, `seed`, `maxSteps`, `maxMs`), same error messages.

## API

### `mountAll(root?, options?)`

Scan `root` (default `document.body`) for `pre > code.language-algoplot` elements
and mount a live `<AlgoPlayer>` in place of each one.

```ts
import { mountAll } from '@algoplot/markdown';

const result = await mountAll(document.body, {
  render: (output) => <AlgoPlayer data={output} />,
  onError: (err, el) => console.error('fence failed:', err),
});

console.log(`mounted ${result.mounted} players`);
// later:
result.dispose();
```

**Options:**

| Option | Type | Description |
| --- | --- | --- |
| `render` | `(output: RunOutput) => ReactNode` | Custom component render. Defaults to `<AlgoPlayer data={output} />`. |
| `onError` | `(error: Error, codeBlock: Element) => void` | Called when a fence fails to execute. |

**Returns:** `{ mounted: number, dispose: () => void }`

Safe to call multiple times — already-mounted fences are skipped via a
`data-algoplot-mounted` attribute.

## Next

A page with no build tooling at all: [Web](web/). Live examples: [Demos](demos/).
