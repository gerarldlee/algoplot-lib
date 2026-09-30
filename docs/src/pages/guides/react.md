---
title: React
description: AlgoPlayer props, theming, SSR, and composing your own controls from the store.
layout: ../../layouts/Base.astro
---

# React

`@algoplot/react` is the ready-made surface: `AlgoPlayer` renders the visualisation
area over one chrome row (caption, metrics, memory chart, transport, logs) and owns
its store. React 18 or 19 as a peer dependency.

```bash
npm install @algoplot/react @algoplot/core
```

```tsx
import { AlgoPlayer } from '@algoplot/react';
import '@algoplot/react/styles.css';

export function Demo({ data }: { data: RunOutput }) {
  return <AlgoPlayer data={data} />;
}
```

## Props

| Prop | Default | Meaning |
| --- | --- | --- |
| `data: RunOutput` | — | The recording. A new identity reloads the player. |
| `autoplay` | off | Start playback when a recording loads. |
| `logs` | *auto* | Show the log panel; defaults to “the run logged something”, decided once from the recording so it cannot flicker while scrubbing. |
| `memory` | on | Memory-growth chart above the transport. |
| `placeholder` | *auto* | Caption while on step 0 with no message. |
| `className` | — | Extra class on the root, which is always `ak-player`. |
| `store` | *owned* | Bring your own store so controls outside the widget can drive it. |

## In MDX

With `@algoplot/remark` in `jsx` mode (see [Fences](fences/)), a fence becomes
`<AlgoPlayer data={…} />`. Your MDX file needs the component in scope:

```mdx
---
layout: …
---
import { AlgoPlayer } from '@algoplot/react';
```

On Astro, also pass `client: 'client:load'` to the plugin so the emitted component
carries the hydration directive — MDX itself has no idea about islands; that is the
host's convention.

## Theming

`styles.css` is scoped under `.ak-player` and declares the full palette on that class
from custom properties (`--panel`, `--border`, `--accent`, `--dim`, `--faint`, …).
Override them — custom properties inherit, so an ancestor works:

```css
.docs-page .ak-player { --accent: #7c5cff; --border: #3a3f52; }
```

This site sets the *same property names* on `:root` for its own chrome, which is why
prose and players read as one theme — the pattern is in `docs/src/styles/global.css`.

## Server rendering

```tsx
import { renderToString } from 'react-dom/server';
renderToString(<AlgoPlayer data={run} />);
```

The store is created **with** the recording, so SSR emits the real frame at step 0 —
not a placeholder that swaps after hydration. (zustand's server snapshot is the store's
*initial* state, which is exactly why the initial state includes the run.)

## Your own controls

```tsx
import { PlayerProvider, usePlayer, Transport, MemoryGraph, LogPanel } from '@algoplot/react';

function Jump({ step }: { step: number }) {
  const seek = usePlayer((s) => s.seek);
  return <button onClick={() => seek(step)}>Jump to {step}</button>;
}

<PlayerProvider store={myStore}>
  <Jump step={7} />
  <Transport />
  <LogPanel />
</PlayerProvider>
```

`usePlayer(selector)` subscribes to slices; `usePlayerStore()` hands back the raw
store for `getState()`; `StructView` renders one structure if you want the views
without any of the chrome. The player store's actions (`play`, `pause`, `seek`,
`setSpeed`, `loadRun`, `destroy`) are the whole control surface — the transport is
just buttons over them.

## Notes from the source app

- `seek(idx)` lands on the state *after* steps `0 … idx-1` — a step recorded at index
  `k` is visible at `idx = k + 1`.
- Destroy stores you create: `store.getState().destroy()` stops the playback loop.
  `AlgoPlayer` does this for *its own* store on unmount and never touches an external
  one.
- The log panel is hidden at `idx = 0` legitimately — nothing has been folded in yet.

## Next

No React on the page at all: [Element](element/).
