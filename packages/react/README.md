# @algoplot/react

The React half of [algoplot](../../README.md): `AlgoPlayer` — the recording, the
visualisation area, transport, memory chart and log panel — plus the individual
components if you want to build your own surface.

```bash
npm install @algoplot/react @algoplot/core
# react and react-dom are peer dependencies (18 or 19)
npm install react react-dom
```

```tsx
import { AlgoPlayer } from '@algoplot/react';
import '@algoplot/react/styles.css';

export function Demo({ data }: { data: RunOutput }) {
  return <AlgoPlayer data={data} />;
}
```

`RunOutput` comes from `@algoplot/core` (`executeRun`, `WorkerRunner`, or a fence
executed at build time by [`@algoplot/remark`](../remark)).

## Props

| Prop | Default | Meaning |
| --- | --- | --- |
| `data: RunOutput` | — | The recording. A new identity reloads the player. |
| `autoplay` | off | Start playback when a recording loads. |
| `logs` | *auto* | Show the log panel; defaults to “the run logged something” (decided once from the recording, so it can’t flicker while scrubbing). |
| `memory` | on | Show the memory-growth chart above the transport. |
| `placeholder` | *auto* | Caption while sitting on step 0 with no message. |
| `className` | — | Extra class on the root (which is always `ak-player`). |
| `store` | *owned* | Bring your own `createPlayerStore(…)` so controls outside the widget can drive it. The component never stops a store it does not own. |

## Styling

`@algoplot/react/styles.css` is the complete sheet, scoped under `.ak-player` and
declaring its palette on that class from the CSS custom properties (`--panel`,
`--border`, `--accent`, `--dim`, …). To theme it, override those properties on the
root (or any ancestor — custom properties inherit):

```css
.my-page .ak-player { --accent: #7c5cff; }
```

The sheet also contains the phone layout (`max-width: 900px`), so it behaves the same
wherever it is mounted.

## Server rendering

```tsx
import { renderToString } from 'react-dom/server';
import { AlgoPlayer } from '@algoplot/react';

renderToString(<AlgoPlayer data={run} />);
```

The store is created **with** the recording (`createPlayerStore(run)`), so SSR emits
the real first frame — not a placeholder that swaps after hydration. Note that
zustand’s server snapshot is the store’s *initial* state: anything you change after
creation is visible client-side only, which is why the player also loads `data` in an
effect (a no-op when the initial state already matches).

## Composing your own UI

```tsx
import { PlayerProvider, usePlayer, Transport, MemoryGraph, LogPanel } from '@algoplot/react';

function JumpTo({ step }: { step: number }) {
  const seek = usePlayer((s) => s.seek);   // or getState() for imperative access
  return <button onClick={() => seek(step)}>Jump</button>;
}

<PlayerProvider store={myStore}>
  <Transport />
  <MemoryGraph />
  <LogPanel />
</PlayerProvider>
```

`usePlayer(selector)` subscribes; `usePlayerStore()` returns the raw store for
`getState()`/`setState()`; `StructView` renders one structure from `world` if you want
the views without the chrome.

## License

MIT — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
