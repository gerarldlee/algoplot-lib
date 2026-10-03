# algoplot

[![npm](https://img.shields.io/npm/v/@algoplot/core.svg)](https://www.npmjs.com/package/@algoplot/core)
[![npm](https://img.shields.io/npm/v/@algoplot/react.svg)](https://www.npmjs.com/package/@algoplot/react)
[![npm](https://img.shields.io/npm/v/@algoplot/markdown.svg)](https://www.npmjs.com/package/@algoplot/markdown)
[![npm](https://img.shields.io/npm/v/@algoplot/remark.svg)](https://www.npmjs.com/package/@algoplot/remark)
[![npm](https://img.shields.io/npm/v/@algoplot/web.svg)](https://www.npmjs.com/package/@algoplot/web)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/gerarldlee/algoplot-lib/actions/workflows/ci.yml/badge.svg)](https://github.com/gerarldlee/algoplot-lib/actions/workflows/ci.yml)

Run algorithm code, record every step as a diff of the visualised world, and play it
back as a scrubbable player — including straight out of a markdown fence:

````markdown
```algoplot js {"input":{"arr":[5,3,8,1]}}
const a = viz.array(input.arr);
for (let i = 0; i < a.length; i++) {
  for (let j = 0; j < a.length - 1 - i; j++) {
    if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
  }
}
viz.step('sorted');
```
````

That fence is **executed at build time** by `@algoplot/remark`. What ships to the
reader is a precomputed recording and a player — no code, no eval, no network: the
step budget fails *your* build, not their browser.

This is the engine extracted from the algoplot teaching app, published as five
packages you can use independently.

## Packages

| Package | What it is |
| --- | --- |
| [`@algoplot/core`](packages/core) | The engine: the `viz.*` API user code calls, the recorder, diffing and world replay, the player store, the worker runner, and the language registry (JavaScript and TypeScript built in). |
| [`@algoplot/remark`](packages/remark) | Runs ``` `algoplot` fences at build time and replaces them with a player. |
| [`@algoplot/react`](packages/react) | `AlgoPlayer` + the transport, memory chart, log panel and 17 structure views. |
| [`@algoplot/web`](packages/web) | `<algoplot-player>`, a self-contained web component: one script tag, no framework, styles in a shadow root. |
| [`@algoplot/markdown`](packages/markdown) | Runtime DOM scanner — mounts live players onto ` ```algoplot ` fences in any rendered HTML. |
| [`@algoplot/python`](packages/python) | Registers Python (Pyodide) into the core registry — for build-time fences and in the worker. Import once, ` ```algoplot python ` works. |

## Pick your integration

- **MDX / React** — remark in `jsx` mode emits an `<AlgoPlayer>` component node:
  [fences](docs/src/pages/guides/fences.md) · [React](docs/src/pages/guides/react.md)
- **Plain markdown** — remark in `html` mode emits `<algoplot-player data-payload="…">`;
  a script tag does the rest: [fences](docs/src/pages/guides/fences.md) ·
  [web](docs/src/pages/guides/web.md)
- **Your own React app** — `executeRun` (or the worker) on one side, `AlgoPlayer` on
  the other: [getting started](docs/src/pages/guides/getting-started.md)
- **Python** — [python](docs/src/pages/guides/python.md)

## The contract in one paragraph

A recording is plain JSON: `RunOutput` = `{ ok, steps, logSteps, world, mem, error? }`.
Every step holds a *diff* of the world (with keyframes every 200 steps), so scrubbing
materialises a frame without re-running anything. `world` is an ordered set of typed
structures — array, list, matrix, grid, graph, tree, plot, flow, gantt, sequence and
more — each with its own view component. Language runners are pluggable behind
`LanguageRunner`; budgets (`maxSteps`, `maxMs`) bound every run.

## Developing this repo

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (node environment)
npm run build       # all five packages, in dependency order
npm run docs        # docs site dev server
npm run docs:build  # TypeDoc + static site → docs/dist
node tools/smoke.mjs  # pack every package, install the tarballs, test the published surface
```

Documentation lives in [`docs/`](docs) (guides on an Astro site that dogfoods the
remark plugin — every algoplot fence on it was executed by its own build) and API
reference is generated with TypeDoc into `docs/public/api` — see
[`docs/README.md`](docs/README.md).

## License

[MIT](LICENSE) — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
