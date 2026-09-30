# @algoplot/core

The headless engine: the `viz.*` API that user code calls, a recorder that turns each
step into a diff of the visualised world, replay/materialisation, the player store,
the worker-backed runner client, and the pluggable language registry. No UI framework
involvement — render it with [`@algoplot/react`](../react),
[`@algoplot/element`](../element), or your own code.

```bash
npm install @algoplot/core
```

## Run something

```ts
import { executeRun } from '@algoplot/core';

const code = `
  const a = viz.array(input.arr);
  for (let i = 0; i < a.length - 1; i++)
    if (a.compare(i, i + 1) > 0) a.swap(i, i + 1);
  viz.step('pass done');
`;

const run = await executeRun(code, {
  language: 'js',            // 'js' | 'ts' (built in); 'py' via @algoplot/python
  input: { arr: [5, 3, 8, 1] },
  seed: 42,
  // maxSteps / maxMs default to the language's budget (LANGUAGES)
});

if (run.ok) {
  console.log(run.steps.length, run.world.order);
} else {
  console.error(run.error?.message, run.error?.line);
}
```

Errors are folded into the output (`ok: false`) with whatever had been recorded — the
same shape the worker reports — so a failed algorithm still explains itself.

### User code and the viz API

User code receives `viz` (structures + `step`/`note`/`log`/`metric`), `rng`, and
`input`. A structure's *registration* is not a step; mutations and explicit `viz.step`
calls are:

```js
const a = viz.array([3, 1, 2]);
a.swap(0, 2);
viz.step('swapped');        // now there are steps to scrub through
```

The step budget is a **recording budget** (memory), `maxMs` is the CPU guard; both
default per language and are overridable per run.

## In a browser: the worker

Script execution belongs in a worker. `WorkerRunner` speaks the `protocol.ts` message
contract against the shipped worker (`@algoplot/core/worker`):

```ts
import { WorkerRunner, type RunOutput } from '@algoplot/core';

const runner = new WorkerRunner();          // uses the packaged worker
const out: RunOutput = await runner.run({ code, input, seed });
runner.dispose();
```

Bundlers that cannot rewrite `new URL('…worker.ts', import.meta.url)` can be handed
one explicitly:

```ts
new WorkerRunner({
  createWorker: () =>
    new Worker(new URL('@algoplot/core/worker', import.meta.url), { type: 'module' }),
});
```

The worker and the main thread share the registry, so a runner registered on either
side (e.g. by importing `@algoplot/python`) is visible to both.

## Playing it back

```ts
import { createPlayerStore } from '@algoplot/core';

const store = createPlayerStore(run);   // state already at the loaded frame — SSR-safe
store.getState().play();
store.getState().seek(12);              // materialises the world *after* steps 0..11
// …when done with it:
store.getState().destroy();             // stops the playback loop
```

The store is a zustand store with an external-store subscription API
(`useSyncExternalStore`), so any framework can bind it. [`@algoplot/react`](../react)
ships `PlayerProvider`/`usePlayer` plus the ready-made UI.

## Languages

JS and TS are built in (`ts` is the JS source with types stripped — there is no
separate TypeScript compiler in the loop). Everything else registers itself:

```ts
import { registerRunner, runnerFor } from '@algoplot/core';

registerRunner(myRunner);   // { id, ensure(), execute(env, code), dispose?() }
const runner = runnerFor('js');  // falls back to js; an unregistered id throws
```

`runnerFor('py')` without
[`@algoplot/python`](../python) imported throws a message that says exactly that.

## Exports

- **execution**: `executeRun`, `Recorder`, `Rng`, `collect`, `LANGUAGES`
- **world model**: `RunOutput`, `Step`, `World`, the structure data types, `applyPatch`
  / `applySteps` / `materializeAt` replay helpers, `diffWorlds`
- **viz API**: `VizApi` and every structure type (`VizArray`, `VizGraph`, `VizTree`, …)
- **player**: `createPlayerStore`, `PlayerState`, `WorkerRunner`
- **protocol**: the worker message types, for custom transports

See the API reference (`docs/public/api` once built) for the full surface.

## License

MIT — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
