# @algoplot/python

Python, for [algoplot](../../README.md): registers a `py` language runner built on
[Pyodide](https://pyodide.org) into `@algoplot/core`'s registry. The registration is
the *entire* setup — there is no second configuration surface:

```bash
npm install @algoplot/python
```

```ts
import '@algoplot/python';        // registerRunner(pyRunner) — that's it

import { executeRun } from '@algoplot/core';
const run = await executeRun('viz.array([3, 1, 2])\nviz.step("made")', { language: 'py' });
```

…or write fences and let the tools pick it up:

````md
```algoplot python {"input":{"arr":[3,1,2]}}
a = viz.array(input["arr"])
viz.step("made")
```
````

- **At build time** ([`@algoplot/remark`](../remark) fences): the runner loads Pyodide
  from the **npm `pyodide` package** — no network fetch on your build machine.
  ```bash
  npm install -D pyodide
  ```
  Without it you get an error that says exactly this, rather than a silent fallback.
- **In the browser** (the worker at run time): Pyodide loads from its CDN by default.
  The packaged worker entry `@algoplot/python/worker` *is* the core worker with Python
  registered, so hand it to the runner:

  ```ts
  const runner = new WorkerRunner({
    createWorker: () =>
      new Worker(new URL('@algoplot/python/worker', import.meta.url), { type: 'module' }),
  });
  ```

The npm package and the CDN are the *same* loader selection logic, so a fence that
builds also runs — the only difference is where the WASM comes from.

## Two entry points, one registration

```ts
import '@algoplot/python';         // main realm (build-time execution, tests)
import '@algoplot/python/worker';  // the worker realm: core's handler + py registration
```

The default `WorkerRunner` worker has **no** Python — core must not depend on
Pyodide — so runtime Python needs the `createWorker` line above. Registration order in
the worker entry is deliberate: core's message handler attaches first, the registry is
a shared chunk, and no message can arrive before module evaluation finishes.

## Where Pyodide comes from

```ts
import { setPyodideIndexUrl, setPyodideLoader, pyodideIndexUrl } from '@algoplot/python';

setPyodideIndexUrl('https://my.cdn/pyodide/v0.27/');   // self-hosted runtime
setPyodideLoader(async (indexURL) => { /* … return a PyodideApi */ });
pyodideIndexUrl();                                     // the URL that will be used
```

Resolution order: an explicit loader → an explicit index URL → the npm `pyodide`
package (node) → the CDN (browser). All of this is per-realm: set it in the realm that
executes — the build machine for fences, the worker for runtime execution.

## What user code sees

Python code receives the same `viz`, `input` and `rng` as JavaScript does, through the
bridge:

```python
a = viz.array(input["arr"])
if a.compare(0, 1) > 0:
    a.swap(0, 1)
viz.step("swapped")
```

Porting notes that matter (each of these was a real bug in the source app):

- JS `null` arrives as `undefined` — where a struct field must be cleared, pass `''`
  or an explicit colour instead.
- Don't shadow Python builtins at module scope (`round`, `id`, …): all runs share one
  interpreter's module namespace across templates — prefer `rnd`, `pass_no`.
- `viz.*` structs expose methods only — no `.data` poking; and `with batched():`
  (a context manager in the injected globals, not `viz.batched`) batches a block into
  one step.

## Budgets

Python's defaults are its own (`LANGUAGES.py.defaults`: `maxSteps: 5000`,
`maxMs: 20000`) because Pyodide boots slower than V8 runs — a fence can override both
via its options object.

## License

MIT — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
