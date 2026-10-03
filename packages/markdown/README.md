# @algoplot/markdown

Mount live algoplot players onto ` ```algoplot ` code fences in any markdown-rendered HTML.

```ts
import { mountAll } from '@algoplot/markdown';

const result = await mountAll(document.body);
// later:
result.dispose();
```

Works with any markdown-to-HTML pipeline — marked, remark, CMS output. Safe to call multiple times; already-mounted fences are skipped via a `data-algoplot-mounted` attribute.

## When to use this vs `@algoplot/remark`

| | `@algoplot/remark` | `@algoplot/markdown` |
| --- | --- | --- |
| When | Build time | Runtime |
| Input | mdast AST | Rendered HTML DOM |
| Output | JSX or HTML nodes | Live React components |
| React needed | No (downstream only) | Yes (peer dep) |

Use `@algoplot/remark` when you control the build pipeline (MDX, Astro, VitePress). Use `@algoplot/markdown` when you only have rendered HTML — a CMS, a docs platform, or any system where you cannot plug into the build.

## API

### `mountAll(root?, options?)`

Scan `root` (default `document.body`) for `pre > code.language-algoplot` elements and mount a live `<AlgoPlayer>` in place of each one.

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

**Returns:** `MountResult`

```ts
interface MountResult {
  mounted: number;              // number of fences mounted by this call
  dispose: () => void;         // removes all players mounted by this call
}
```

### Fence format

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

## License

MIT — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
