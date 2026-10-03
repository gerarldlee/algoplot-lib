---
title: Getting started
description: Three ways to ship an algoplot player, and what a recording is.
layout: ../../layouts/Base.astro
---

# Getting started

algoplot records algorithm runs as **playable data**. Your code executes once — at
build time or in a worker — and what ships is a `RunOutput`: a list of step diffs over
a visualised world. Rendering it is then pure state machine: scrub, play, no
re-execution, no `eval`.

## Three ways in

| Your context | Stack | Guide |
| --- | --- | --- |
| Docs in MDX / React | `@algoplot/remark` (jsx) + `@algoplot/react` | [Fences](fences/) · [React](react/) |
| Plain markdown, any generator | `@algoplot/remark` (html) + `@algoplot/web` | [Fences](fences/) · [Web](web/) |
| An application | `@algoplot/core` + `@algoplot/react` | below · [React](react/) |

## The application path, end to end

```bash
npm install @algoplot/core @algoplot/react
```

**1. Execute.** `executeRun` is the synchronous-orchestration-free API: async, folds
errors into the output, budgets per language.

```ts
import { executeRun } from '@algoplot/core';

const run = await executeRun(
  `const a = viz.array(input.arr);
   for (let i = 0; i < a.length - 1; i++)
     if (a.compare(i, i + 1) > 0) a.swap(i, i + 1);
   viz.step('pass done');`,
  { input: { arr: [5, 3, 8, 1] }, seed: 42 },
);

if (!run.ok) throw new Error(run.error?.message);
```

In the browser, run it in a worker instead — `new WorkerRunner().run({ code, input })` —
so a long algorithm never blocks the UI thread. ([core README](../../packages/core/README.md))

**2. Render.**

```tsx
import { AlgoPlayer } from '@algoplot/react';
import '@algoplot/react/styles.css';

export const Page = () => <AlgoPlayer data={run} />;
```

That's the whole integration: no transport wiring, no per-view code. The component
creates its own store from `data`, renders the world at step 0 on the server if you
SSR, and cleans up its playback loop on unmount.

## What's in a recording

```ts
interface RunOutput {
  ok: boolean;
  steps: Step[];        // each a diff of the world (full keyframe every 200 steps)
  logSteps: number[];   // step index of each log line
  world: World;         // ordered structs: the *last* state, for reference
  mem: { bytes: number; steps: number }[];  // recording size growth
  error?: { message: string; line?: number };
}
```

The player materialises a world per step index from the diffs — that is why scrubbing
is cheap and why the recording, not the browser heap, is what the memory chart shows.

## 3D structures: octree

`viz.octree(extent)` creates a volumetric quadtree — a tree of axis-aligned cubes. Subdivide cubes into 8 octants, mark leaves, and annotate:

```js
const oc = viz.octree(16);
const root = oc.rootCube();
oc.subdivide(root, [0, 1, 2, 3]);  // build only the octants you need
oc.leaf('n1');                      // mark a cube as final
oc.color('n1', 'accent');           // persistent colour
oc.point(1, 2, 3);                  // a point in the volume
oc.sphere(0, 0, 0, 5);              // a query region
viz.step('octree built');
```

## Determinism and budgets

- **`seed`** feeds a deterministic RNG; same code + input + seed ⇒ same recording.
- **`maxSteps`** bounds the *recording* (memory); **`maxMs`** bounds CPU. Defaults are
  per language (`LANGUAGES` in core); a fence's options object overrides them per run.
- A step costs work proportional to the *whole world* (it diffs it), so size inputs to
  what stays legible — not to what the algorithm would tolerate.

## Python

One import turns ` ```algoplot python ` on, at build time and in the worker — see the
[Python guide](python/).

## Next

- The full fence grammar: [Fences](fences/)
- Your own controls around the store: [React](react/)
- A page with no build tooling at all: [Web](web/)
- Live examples on this site: [Demos](demos/)
