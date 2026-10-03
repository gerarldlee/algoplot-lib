# @algoplot/web

`<algoplot-player>` — the whole algoplot player as a web component. One self-contained
ES module: React, the engine and the stylesheet are bundled in, styles live in a
shadow root, and your page needs no framework, no bundler and no CSS link.

```html
<script type="module" src="https://your.cdn/@algoplot/web/dist/index.js"></script>

<!-- typically emitted by @algoplot/remark's html mode: -->
<algoplot-player data-payload='{"ok":true,"steps":[…]}' autoplay></algoplot-player>
```

```bash
npm install @algoplot/web
# bundlers: import '@algoplot/web'; — importing registers the element.
```

## Attributes

| Attribute | Effect |
| --- | --- |
| `data-payload` | The recording as JSON — the `RunOutput` of a build-time fence, or `executeRun` output you embedded. Invalid JSON or a non-`RunOutput` shape renders the reason instead of an empty box. Absent → nothing is rendered. |
| `autoplay` | Presence starts playback (HTML boolean-attribute semantics). |
| `no-logs` | Presence hides the log panel. Absent → the component decides from the recording. |
| `no-memory` | Presence hides the memory-growth chart. |
| `placeholder` | Caption text for step 0. |

Every attribute is observed: editing `data-payload` reloads the player in place.

## Why a shadow root

The stylesheet is injected into the component's own shadow root, so page CSS cannot
break the player and player CSS cannot leak into the page. The sheet is scoped to
`.ak-player` and declares its palette there from the same custom properties as
[`@algoplot/react`](../react), so it is self-contained by construction. Custom
properties set *on the element* still inherit in, if you want to retheme from outside:

```html
<algoplot-player data-payload="…" style="--accent:#7c5cff"></algoplot-player>
```

(Inside the shadow, `.ak-player` re-declares the full palette for the default theme —
to retheme, override after that declaration or build a variant.)

## Size

The bundle is React, `react-dom`, `@algoplot/core` and the views in one file:
~820 kB raw / ~195 kB gzipped. It is a *drop-in* file — that is the trade — so prefer
[`@algoplot/react`](../react) when you already ship React, where you only pay for the
player itself.

## Framework-free pairing

```html
<!-- markdown pipeline runs @algoplot/remark with mode: 'html' at build time -->
<script type="module" src="./algoplot-player.js"></script>
<algoplot-player data-payload="{&quot;ok&quot;:true,…}"></algoplot-player>
```

The attribute the plugin writes is escaped for the document; the browser unescapes it
on parse, so `getAttribute('data-payload')` reads back the exact JSON.

## API

```ts
import {
  register,             // define('algoplot-player') — idempotent, runs on import in a browser
  AlgoPlayerElement,    // the class, for extending or defining under another tag
  parsePayload,         // string → RunOutput (null when absent)
  configFrom,           // attributes → AlgoPlayer props
} from '@algoplot/web';
```

Importing the package in node (tests, SSR) is side-effect-safe: registration is gated
on `customElements` existing.

## License

MIT — Copyright (c) 2026 Gerald Lee &lt;gerarldlee@gmail.com&gt;.
