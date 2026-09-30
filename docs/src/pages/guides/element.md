---
title: Element
description: '<algoplot-player> — the player as a web component, for pages with no framework and no build step.'
layout: ../../layouts/Base.astro
---

# Element

`@algoplot/element` is the whole player as a custom element. React, the engine and the
stylesheet are bundled into one ES module; styles live in the component's **shadow
root**, so neither your page's CSS nor the player's can affect the other.

```html
<script type="module" src="./algoplot-player.js"></script>

<algoplot-player data-payload='{"ok":true,"steps":[…]}' autoplay></algoplot-player>
```

With a bundler it is one import, which registers the element as a side effect:

```ts
import '@algoplot/element';
```

This site uses exactly that: the layout imports the package, and every
`mode: 'html'` fence below upgraded itself on load.

## Attributes

| Attribute | Effect |
| --- | --- |
| `data-payload` | The recording as JSON. Invalid JSON or a non-recording shape renders the *reason* instead of an empty box. Absent → nothing rendered. |
| `autoplay` | Presence starts playback (HTML boolean-attribute semantics). |
| `no-logs` | Presence hides the log panel; absent → the component decides from the recording. |
| `no-memory` | Presence hides the memory chart. |
| `placeholder` | Caption text for step 0. |

All five are observed: replacing `data-payload` reloads the player in place.

## Pairing with the plugin

````md
```algoplot js {"input":{"arr":[3,1,2]}}
const a = viz.array(input.arr);
a.swap(0, 2);
viz.step('swapped');
```
````

```js
// in your markdown generator's remark config
remarkPlugins: [[remarkAlgoplot, { mode: 'html' }]]
```

The plugin escapes the payload for the document (`"` → `&quot;` and friends); the
browser un-escapes on parse, so `getAttribute('data-payload')` reads back byte-identical
JSON. No MDX, no React, no hydration framework — a markdown pipeline you have never
heard of can render these, because all it does is pass an HTML node through.

## Shadow DOM

The component attaches `mode: 'open'` and injects `<style>` before the player root.
The sheet is scoped to `.ak-player` — same palette custom properties as
`@algoplot/react`, declared *inside* the shadow, so the default theme is
self-contained. Custom properties set on the element still inherit in, so you can
retheme pieces the sheet does not declare:

```html
<algoplot-player data-payload="…" style="--accent:#7c5cff"></algoplot-player>
```

## Size, honestly

One drop-in file (~820 kB raw, ~195 kB gzipped) contains React, `react-dom`, core and
the views. That is the trade for zero integration — if your page already ships React,
[`@algoplot/react`](react/) is smaller, and if you are on MDX, jsx mode skips the
duplicate runtime entirely.

## API

```ts
import { register, AlgoPlayerElement, parsePayload, configFrom } from '@algoplot/element';

register('my-player');       // idempotent; auto-registers 'algoplot-player' in a browser
parsePayload(attr);          // string → RunOutput | null (throws with a reason)
configFrom(el);              // the attribute → prop mapping, as pure functions
```

Importing the package in node (tests, SSR) is side-effect-safe: registration is gated
on `customElements` existing.

## Next

Python fences: [Python](python/). Live examples: [Demos](demos/).
