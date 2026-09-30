---
title: Demos
description: Players executed by this site's own build — bubble sort, binary search, and Python.
layout: ../../layouts/Base.astro
---

# Demos

Everything on this page was **run while this site was building**. Each fence below
became `RunOutput` JSON in the generated HTML; `<algoplot-player>` upgraded it on
load. View source: there is no algorithm program in it, and nothing executes here.

## Bubble sort (JavaScript)

```algoplot js {"input":{"arr":[5,3,8,1,9,2,7,4]}}
const { arr } = input;
const a = viz.array(arr);
viz.log('bubble sort: repeatedly swap adjacent out-of-order pairs');

for (let i = 0; i < a.length - 1; i++) {
  let swapped = false;
  for (let j = 0; j < a.length - 1 - i; j++) {
    if (a.compare(j, j + 1) > 0) { a.swap(j, j + 1); swapped = true; }
  }
  a.mark(a.length - 1 - i, 'sorted', `end of pass ${i + 1}`);
  if (!swapped) break;
}
viz.step('sorted');
```

Scrub it, play it at two speeds, read the logs — the log lines are in the recording
(`logSteps`), not rebuilt from the DOM. The run came from the fence you can see in the
markdown source of this page.

## Binary search (TypeScript)

The `ts` alias strips types with sucrase and runs on the JavaScript runner — there is
no separate TypeScript build in the pipeline:

```algoplot ts {"input":{"arr":[1,3,4,7,9,11,15,18,21,27],"target":11}}
const { arr, target } = input;
const a = viz.array(arr);

let lo = 0;
let hi = a.length - 1;
let found = false;
let at = -1;

viz.log(`binary search for ${target} in a sorted array`);
a.range(lo, hi, 'range1', 'search window');

while (lo <= hi) {
  const mid = Math.floor((lo + hi) / 2);
  const v = Number(a.at(mid));
  if (v === target) {
    a.mark(mid, 'found', `a[${mid}] = ${v} — found ${target}!`);
    found = true;
    at = mid;
    break;
  }
  if (v < target) {
    a.peek(mid, `a[${mid}] = ${v} < ${target} — discard left half`);
    lo = mid + 1;
  } else {
    a.peek(mid, `a[${mid}] = ${v} > ${target} — discard right half`);
    hi = mid - 1;
  }
  if (lo <= hi) a.range(lo, hi, 'range1', 'search window', `window [${lo}..${hi}]`);
}

a.clearRanges();
if (!found) viz.note(`${target} is not in the array`);
viz.metric('found', found ? 'yes' : 'no');
if (found) viz.metric('index', at);
viz.step(found ? 'found' : 'not present');
```

## Python

This fence needed nothing but `@algoplot/python` in the build's dev dependencies —
Pyodide booted from the npm package while this page was compiling:

```algoplot python {"input":{"arr":[4,1,3,2]}}
a = viz.array(input["arr"])
viz.log("selection sort, python edition")

for i in range(len(a) - 1):
    least = i
    for j in range(i + 1, len(a)):
        if a.compare(j, least) < 0:
            least = j
    if least != i:
        a.swap(i, least)
    a.mark(i, "sorted", f"position {i} settled")

viz.step("sorted")
```

## What to look for

- **No network tab traffic** when you scrub — the recording is in the page.
- **The same seed twice** gives the same animation: rebuild this site and these
  players come out byte-identical.
- **A broken fence would have broken the build** — the errors guide on
  [Fences](fences/) lists the messages you would have seen in CI instead.

## Try the other modes

These are html-mode fences (plain markdown + the web component). The same programs as
`mode: 'jsx'` MDX nodes — `<AlgoPlayer data={…} />`, `AlgoPlayer` imported in the
file, `client: 'client:load'` passed to the plugin for Astro islands — are configured
in your own build's remark options; see [Fences](fences/) and [React](react/). This
site runs one mode across all its pages, and html is the one that keeps a docs page
honest about needing nothing from the reader.
