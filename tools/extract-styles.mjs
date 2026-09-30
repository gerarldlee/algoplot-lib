// One-time migration aid: lifts the player's styles out of the algoplot app
// (src/ui/styles.css) and gates every selector under `.ak-player`.
//
// Usage: node tools/extract-styles.mjs
//
// Selector-based extraction, not line ranges: the app's stylesheet is edited
// constantly, and a line range would silently drift. Each rule is matched on its
// normalised selector text; the view block is taken between two section markers.
// Output goes to packages/react/styles.css — a plain file at the package root,
// exported as `@algoplot/react/styles.css` and deliberately NOT imported by the
// package entry, so `import '@algoplot/react'` stays side-effect-free.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_CSS = 'C:/Users/Gerard/workspace/algoplot/src/ui/styles.css';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'react', 'styles.css');
const PREFIX = '.ak-player';

/** Rules kept by exact selector match (comma parts normalised). */
const WANTED = new Set([
  // .field + .btn family (Transport)
  '.field', '.field:focus',
  '.btn', '.btn:hover:not(:disabled)', '.btn:disabled',
  '.btn.primary', '.btn.primary:hover:not(:disabled)',
  '.btn.danger', '.btn.danger:hover:not(:disabled)',
  'a.btn',
  // chrome (the .chrome min-height floor and the right-column layout rule)
  '.chrome', '.chrome-main',
  // the player body: view area, caption, metrics, transport, logs, memory graph
  '.view-area', '.placeholder', '.unknown-view',
  '.error', '.err-line',
  '.caption',
  '.metrics', '.metrics:empty', '.metric', '.metric b',
  '.transport', '.scrub', '.counter',
  '.log-area', '.log-area-body', '.log-area-body[hidden]',
  '.log-area-body.log-area-input', '.logs-empty',
  '.log-line', ".log-line[role='button']", ".log-line[role='button']:hover",
  '.log-line.current',
  '.mem-graph', '.mem-label', '.mem-val', '.mem-val.warn', '.mem-plot',
  '.mem-area', '.mem-line', '.mem-cursor', '.mem-dot',
]);

const ZONE_START = '/* ---------- array view ---------- */';
const ZONE_END = '/* ---------- responsive ---------- */';

const src = readFileSync(APP_CSS, 'utf8');
const n = src.length;
let i = 0;
let inZone = false;
let pending = ''; // comments buffered ahead of the next rule
let out = '';

function flushPending() {
  out += pending;
  pending = '';
}

function readComment() {
  const end = src.indexOf('*/', i);
  const text = src.slice(i, end === -1 ? n : end + 2);
  i = end === -1 ? n : end + 2;
  return text;
}

/** Copy a block body (after '{') through its matching '}', advancing i past '}'. */
function copyBlock() {
  let depth = 1;
  const start = i;
  while (i < n && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    if (depth > 0) i++;
  }
  const body = src.slice(start, i);
  if (src[i] === '}') i++;
  return body;
}

function prefixSelectors(prelude) {
  return prelude
    .split(',')
    .map((part) => {
      const s = part.trim().replace(/\s+/g, ' ');
      return s.startsWith(PREFIX) ? s : `${PREFIX} ${s}`;
    })
    .join(',\n  ');
}

while (i < n) {
  const ch = src[i];
  if (/\s/.test(ch)) {
    i++;
    continue;
  }
  if (src.startsWith('/*', i)) {
    const text = readComment();
    if (inZone && text.trim() === ZONE_END) {
      inZone = false;
      continue; // the responsive header itself is not part of the lift
    }
    if (text.trim() === ZONE_START) inZone = true;
    if (inZone) {
      flushPending();
      out += text;
    } else {
      pending += text;
    }
    continue;
  }
  if (ch === '}') {
    i++; // stray close (should not occur in valid input)
    continue;
  }
  // A rule: prelude up to '{', then its block.
  const start = i;
  while (i < n && src[i] !== '{') i++;
  if (i >= n) break;
  const prelude = src.slice(start, i).trim();
  i++; // past '{'
  const body = copyBlock();

  if (prelude.startsWith('@media') || prelude.startsWith('@')) {
    // The app's media blocks mix player rules with rules the player does not have
    // (splitters, editor, search), so none are lifted wholesale — the three phone
    // rules the player shares are hand-copied into the header below. A future in-zone
    // at-rule would need its inner selectors prefixed too; refuse loudly rather than
    // ship an unprefixed block that escapes the scope.
    if (inZone) throw new Error(`in-zone at-rule not supported: ${prelude.slice(0, 60)}`);
    pending = '';
    continue;
  }

  const parts = prelude.split(',').map((p) => p.trim().replace(/\s+/g, ' '));
  const keep = inZone || parts.some((p) => WANTED.has(p));
  if (keep) {
    flushPending();
    out += `${prefixSelectors(prelude)} {${body}}\n\n`;
  } else {
    pending = '';
  }
}

// The app ships `min-height: 200;` on .chrome-main — no unit, so standards-mode
// browsers drop the declaration and the floor silently lives only on .chrome.
// Carrying the dead line over would look like a feature and do nothing; say so.
out = out.replace(
  /\.ak-player \.chrome-main \{[^}]*\}/,
  (block) =>
    block.replace(
      /\n\s*min-height: 200;/,
      '\n  /* the app has `min-height: 200` here — no unit, so it is ignored. The 200px\n     floor is `.chrome`\'s; this line was dead where it came from and is not copied. */',
    ),
);

const header = `/* @algoplot/react player styles.
   Lifted from the algoplot app's src/ui/styles.css by tools/extract-styles.mjs and
   gated under \`.ak-player\`: every selector is prefixed, and the palette + --cellw are
   declared on the root itself, so a host themes the widget by redefining any of these
   custom properties on \`.ak-player\` (or overriding the whole block by loading its own
   rules after this file). \`.chrome\`/\`.log-area\` heights read var(--s3, 300px) /
   var(--s4, 96px) from the app's split sizes, so a host can size them from an ancestor
   without touching the stylesheet. */

.ak-player {
  color-scheme: dark;
  --bg: #0f172a;
  --panel: #1e293b;
  --panel-2: #16223a;
  --border: #334155;
  --text: #e2e8f0;
  --dim: #94a3b8;
  --faint: #64748b;
  --accent: #38bdf8;
  --warn: #fbbf24;
  --danger: #ef4444;
  --node-fill: #1e293b;
  --node-stroke: #64748b;
  --edge: #475569;
  --link: #475569;
  --svg-dim: #94a3b8;
  --bar-idle: #334155;
  --on-accent: #0b1220;
  --range-text: #0b1220;
  --op-text: #f8fafc;
  --op-shadow: rgba(0, 0, 0, 0.7);
  --hover: #475569;
  --accent-hover: #7dd3fc;
  --success: #4ade80;
  --error-text: #fca5a5;
  --cellw: 26px;

  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 14px;
}

/* The app sets this globally; the widget has to carry its own, or a host page with
   content-box sizing lays the views' borders out two pixels wide everywhere. */
.ak-player,
.ak-player * {
  box-sizing: border-box;
}

.ak-player button,
.ak-player input,
.ak-player select,
.ak-player textarea {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

`;

const phone = `
/* Below 900px the app turns its fixed panes back into content. The player has no
   editor or splitter, so the three rules it shares are the ones lifted here: the
   visualisation gets a height of its own in a scrolling page (its \`flex: 1\` would
   otherwise resolve against nothing), and the chrome/log panes stop being fixed so the
   transport cannot be pushed off a short screen. */
@media (max-width: 900px) {
  ${PREFIX} .view-area {
    min-height: 60vh;
  }

  ${PREFIX} .chrome,
  ${PREFIX} .log-area {
    height: auto;
  }

  ${PREFIX} .log-area {
    max-height: 40vh;
  }
}
`;

writeFileSync(OUT, header + out.trimEnd() + '\n' + phone, 'utf8');
console.log(`wrote ${OUT} (${header.length + out.length + phone.length} bytes)`);
