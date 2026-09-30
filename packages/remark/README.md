# @algoplot/remark

The remark plugin that makes ```` ```algoplot ```` fences **executable at build
time**: it runs the code, captures the recording, and replaces the fence with a player. Your
readers get a scrubbable animation; they never receive your code, never execute
anything, and the whole thing is plain precomputed JSON.

```bash
npm install @algoplot/remark @algoplot/core
```

## Fence syntax

````md
```algoplot [js|ts|python] [{"input":…, "seed":n, "maxSteps":n, "maxMs":n}]
<your algorithm code>
```
````

- The first word after `algoplot` is the language (`js` default; aliases accepted:
  `javascript`, `typescript`, `python`, `py`). Unknown language → build error.
- The rest of the info string is a JSON object. Allowed keys —
  **and only these**, because a silently ignored typo would run the wrong program:
  `input`, `seed`, `maxSteps`, `maxMs`.
- Your run exceeds a budget or throws → the **build fails**, with the fence's position
  and the error's line. A broken algorithm should not reach production as an empty box.

## Two modes

```ts
// astro.config.mjs / mdx options / unified pipeline
import remarkAlgoplot from '@algoplot/remark';

remarkPlugins: [[remarkAlgoplot, { mode: 'html' }]]   // default for plain markdown
```

**`mode: 'jsx'`** (default) — emits an MDX node:

```jsx
<AlgoPlayer data={{ ok: true, steps: [/* … */], /* … */ }} />
```

The recording is embedded as an *expression*, so it arrives as an object with no parse
step. Your MDX pipeline must have `AlgoPlayer` in scope:

```mdx
import { AlgoPlayer } from '@algoplot/react';
```

**`mode: 'html'`** — emits markup a browser needs no build tooling to understand:

```html
<algoplot-player data-payload="{&quot;ok&quot;:true,&quot;steps&quot;:[…]}"></algoplot-player>
```

Paired with [`@algoplot/element`](../element) (one `<script type="module">`), that works
in *any* markdown pipeline — no MDX, no React on the page.

## Options

```ts
remarkAlgoplot({
  mode: 'jsx' | 'html',  // default 'jsx'
  maxSteps?: number,     // defaults; a fence's own options win
  maxMs?: number,
  seed?: number,
})
```

Execution shares one set of registered language runners and runs fences **serially** —
relevant for Python, where one Pyodide instance serves the whole build.

## Python fences

```bash
npm install -D @algoplot/python pyodide
```

That's the whole setup: importing `@algoplot/python` registers the `py` runner, and at
build time Pyodide loads from the `pyodide` npm package (no CDN fetch on your build
machine). Without it, a `python` fence fails the build with an install hint. See
[the Python guide](../../python/README.md).

## Error examples

```
docs/intro.md:14:1-22:4: ```algoplot js fence failed (line 3): boom
docs/graphs.md:3:1: ```algoplot fence: unknown option 'imput' (allowed: input, seed, maxSteps, maxMs)
```

`file.fail` with the fence node — your markdown tooling shows the position, your CI
shows the message.

## License

MIT — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
