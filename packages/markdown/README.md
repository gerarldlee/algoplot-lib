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

**Options:**

- `render` — custom component render, receives the `RunOutput` and must return React elements. Defaults to `<AlgoPlayer data={output} />`.
- `onError` — called when a fence fails to execute. Receives the error and the original code block element.

**Returns:** `{ mounted: number, dispose: () => void }`

## License

MIT — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
