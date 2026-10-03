---
title: Fences
description: 'The ```algoplot fence grammar, the two emission modes, and how build-time execution fails.'
layout: ../../layouts/Base.astro
---

# Fences

A fence is an algorithm program in your markdown. `@algoplot/remark` executes it
**while the site builds**, captures the recording, and replaces the fence with a
player. Nothing about the program reaches the reader — not the source, not a runtime,
not a network request.

````md
```algoplot js {"input":{"arr":[5,3,8,1]}}
const a = viz.array(input.arr);
for (let i = 0; i < a.length - 1; i++)
  if (a.compare(i, i + 1) > 0) a.swap(i, i + 1);
viz.step('done');
```
````

The fence above renders as a live player on the [Demos](demos/) page — it is not a
screenshot, it was executed when you loaded this site's build.

## Grammar

````
```algoplot [language] [{ "options": "…" }]
program text…
```
````

- **Language** — first word after `algoplot`. `js` is the default; accepted aliases:
  `javascript`, `typescript` (`ts`), `python`, `py`. Anything else fails the build by
  name.
- **Options** — the rest of the info string is one JSON object, or nothing. Allowed
  keys, exhaustively:

| Key | Type | Meaning |
| --- | --- | --- |
| `input` | any | The value user code reads as `input`. |
| `seed` | number | Deterministic RNG seed (default 42). |
| `maxSteps` | number | Recording budget for this fence. |
| `maxMs` | number | CPU budget for this fence. |

The set is closed **on purpose**. A silently ignored `"imput"` would run your program
on the wrong data and publish a confident wrong animation; an error at the fence's
position is the only honest outcome. The same applies to a non-object options
value (`[1,2]`) or invalid JSON — all build failures.

## Two modes, one plugin

```js
// astro.config.mjs (this site), or any unified/remark pipeline
import { unified } from '@astrojs/markdown-remark';
import remarkAlgoplot from '@algoplot/remark';

markdown: {
  processor: unified({ remarkPlugins: [[remarkAlgoplot, { mode: 'html' }]] }),
}
```

| | `mode: 'jsx'` (default) | `mode: 'html'` |
| --- | --- | --- |
| Emits | `<AlgoPlayer data={{…}} />` MDX node | `<algoplot-player data-payload="…">` |
| Pipeline | MDX / `@mdx-js/mdx` | plain markdown → HTML |
| Reader cost | your React bundle | one script tag (`@algoplot/web`) |
| Scope requirement | `AlgoPlayer` imported in the file (or `MDXProvider`) | none |
| Host directive | pass `client: 'client:load'` (Astro) so islands hydrate | n/a — the custom element upgrades itself |

The payload is embedded as an **expression** in jsx mode (JSON *is* expression syntax),
so the component receives an object with no parse step; in html mode it is an escaped
attribute the browser un-escapes back to identical JSON.

## Execution model

- Fences run **serially** — they share language runners, and Python shares one Pyodide
  instance whose state cannot interleave.
- Same `seed` + input + code ⇒ byte-identical recording. Rebuilding does not drift.
- Budgets are enforced at *run* time; a fence that spins forever stops at its budget
  and fails the build with the stop reason, rather than hanging CI.
- `@algoplot/core`'s JavaScript and TypeScript runners are built in. Python needs
  [`@algoplot/python`](python/) installed as a dev dependency.

## Errors are build failures

```
docs/graphs.md:12:1-19:4: ```algoplot js fence failed (line 3): boom is not a function
docs/sorts.md:4:1: ```algoplot fence: unknown option 'imput' (allowed: input, seed, maxSteps, maxMs)
```

`file.fail` is called with the fence node, so every markdown toolchain that surfaces
positions (Astro, MDX, CI logs) points at the exact fence and line. Your site never
publishes a broken player, because a broken player never finishes building.

## Reading the result

The `RunOutput` the fence produced is the same object the
[React](react/) and [Element](element/) guides consume — there is no second format. If
you want the raw data (to animate it your own way), execute the fence's program with
`executeRun` from `@algoplot/core` in your own build script instead of the plugin.

## Next

Working fences, executed on this page: [Demos](demos/).
