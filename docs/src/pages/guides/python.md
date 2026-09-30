---
title: Python
description: Pyodide for fences and the worker — one import to register, where the runtime comes from, and the porting traps.
layout: ../../layouts/Base.astro
---

# Python

`@algoplot/python` registers a `py` language runner built on
[Pyodide](https://pyodide.org) into core's registry. **Importing it is the whole
setup** — there is no second configuration surface, in either realm.

## At build time (fences)

```bash
npm install -D @algoplot/python pyodide
```

The dev dependency on `pyodide` is what makes this work *offline*: the runner resolves
the npm package's own directory with Node resolution and boots Pyodide from disk. No
CDN fetch on your build machine, no flaky CI dependency. Miss it and the fence fails
the build with an error that names the package to install.

````md
```algoplot python {"input":{"arr":[3,1,2]}}
a = viz.array(input["arr"])
a.swap(0, 2)
viz.step("swapped")
```
````

Then configure `@algoplot/remark` as usual (see [Fences](fences/)) — the plugin does
not know or care that the fence is Python; it asks the registry, and the registry
knows because something imported `@algoplot/python` first. In practice: import it from
your build config or a tiny setup module that your markdown config loads.

## In the worker (runtime execution)

Core must not depend on Pyodide, so the *default* worker has no Python. The package
ships its own entry — core's message handler plus the registration — for you to hand
to the runner:

```ts
import { WorkerRunner } from '@algoplot/core';

const runner = new WorkerRunner({
  createWorker: () =>
    new Worker(new URL('@algoplot/python/worker', import.meta.url), { type: 'module' }),
});
const out = await runner.run({ language: 'py', code, input });
```

In the browser Pyodide loads from its CDN by default; the npm package and the CDN are
the same loader-selection code path, so *a fence that builds also runs* — only the
source of the WASM differs.

## Choosing where Pyodide comes from

```ts
import { setPyodideIndexUrl, setPyodideLoader } from '@algoplot/python';

setPyodideIndexUrl('https://my.cdn/pyodide/v0.27.0/');   // self-host
setPyodideLoader(async (indexURL) => { /* … return PyodideApi */ });  // full control
```

Resolution order: explicit loader → explicit index URL → npm `pyodide` (node) → CDN
(browser). Configuration is **per realm**: the build machine for fences, the worker at
run time.

## What user code sees

```python
a = viz.array(input["arr"])
if a.compare(0, 1) > 0:
    a.swap(0, 1)
with batched():                 # one step for the whole block
    for i in range(len(a)):
        a.mark(i, 'tmp')        # an explicit colour — None cannot cross the bridge
viz.step("marked")
```

`viz`, `input` and `rng` are injected per run; `batched()` is a context manager in the
injected globals (not `viz.batched`).

## Porting traps (each one cost the source app a real bug)

- **JS `null` becomes `undefined`** — where a field must be cleared, pass `''` or an
  explicit colour; `null` cannot survive the bridge.
- **Don't shadow builtins at module scope.** All runs share one interpreter namespace,
  so `round = 0` in one program breaks `round()` in the next. Prefer `rnd`, `pass_no`.
  (`id` is already bound at module scope in many ports — harmless only while nothing
  calls `id()`.)
- **Structs expose methods, not data** — `a.insert(x)` yes, `a.data[…]` no.
- **Pass positionally** where the JS original passed `undefined` explicitly; a Python
  `None` arriving as `null` can flip a mode.
- Python's default budgets are its own (`5000` steps, `20000` ms) because Pyodide
  boots slower than V8 runs.

## Next

[Demos](demos/) include a Python fence, executed by this very site at build time.
