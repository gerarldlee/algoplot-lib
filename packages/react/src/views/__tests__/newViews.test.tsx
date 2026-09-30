import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SequenceView } from '../SequenceView';
import { PlotView } from '../PlotView';
import { NetView } from '../NetView';
import { GanttView } from '../GanttView';
import { BookView } from '../BookView';
import { DeckView } from '../DeckView';
import { FlowView } from '../FlowView';
import { TreeView } from '../TreeView';
import { MatrixView } from '../MatrixView';
import { StringView } from '../StringView';
import type { SeqData } from '@algoplot/core';
import type { PlotData } from '@algoplot/core';
import type { NetData } from '@algoplot/core';
import type { GanttData } from '@algoplot/core';
import type { BookData } from '@algoplot/core';
import type { DeckData } from '@algoplot/core';
import type { FlowData } from '@algoplot/core';
import type { TreeData } from '@algoplot/core';
import type { MatrixData } from '@algoplot/core';
import type { StringData } from '@algoplot/core';

describe('new views', () => {
  it('SequenceView renders lanes, messages, locks', () => {
    const data: SeqData = {
      type: 'sequence',
      name: 'sq',
      lanes: ['client', 'server'],
      events: [
        { k: 'msg', from: 0, to: 1, label: 'GET /', t: 0 },
        { k: 'self', lane: 1, label: 'handle', t: 1 },
        { k: 'hold', lane: 1, label: 'lock db', t: 2 },
      ],
      locks: [{ name: 'db', owner: 1 }],
      t: 3,
    };
    const html = renderToString(<SequenceView data={data} />);
    expect(html).toContain('client');
    expect(html).toContain('GET /');
    expect(html).toContain('handle');
    expect(html).toContain('lock db');
    expect(html).toContain('db · server');
  });

  it('PlotView renders points, curves, trail', () => {
    const data: PlotData = {
      type: 'plot',
      name: 'p',
      domain: { xmin: -5, xmax: 5, ymin: -2, ymax: 8 },
      points: [{ x: 1, y: 2, c: 'focus', label: 'a' }],
      polys: [{ id: 'loss', pts: [[-5, 8], [0, 1], [5, 6]], c: 'cmp', dash: false }],
      circles: [{ x: 0, y: 1, r: 12, c: 'path' }],
      texts: [{ x: 2, y: 3, s: 'lr', c: null }],
      trail: [[-4, 7], [-2, 3], [0, 1]],
    };
    const html = renderToString(<PlotView data={data} />);
    expect(html).toContain('polyline');
    expect((html.match(/<polyline/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('lr');
  });

  it('NetView renders layers with activations and flow', () => {
    const data: NetData = {
      type: 'net',
      name: 'n',
      layers: [
        { id: 'in', label: 'input', n: 3 },
        { id: 'out', label: 'output', n: 2 },
      ],
      act: { in: [0.5, 0.2, null], out: [0.9, 0.1] },
      w: { in: [[0.4, -0.6], [0.1, 0.2], [0.7, 0.3]] },
      flow: { in: 'fwd', out: null },
    };
    const html = renderToString(<NetView data={data} />);
    expect(html).toContain('input');
    expect(html).toContain('forward');
    expect(html).toContain('units');
  });

  it('GanttView renders bars, cursor, marks', () => {
    const data: GanttData = {
      type: 'gantt',
      name: 'g',
      rows: ['P1', 'P2'],
      bars: [
        { row: 0, start: 0, end: 4, c: 'focus', label: 'A' },
        { row: 1, start: 4, end: 7, c: 'best', label: 'B' },
      ],
      cursor: 5,
      marks: [4],
      horizon: 8,
    };
    const html = renderToString(<GanttView data={data} />);
    expect(html).toContain('P1');
    expect(html).toContain('t=5');
    expect(html).toContain('>A<');
  });

  it('BookView renders ladder', () => {
    const data: BookData = {
      type: 'book',
      name: 'ob',
      bids: [{ px: 99, qty: 30 }, { px: 98, qty: 12 }],
      asks: [{ px: 101, qty: 20 }, { px: 102, qty: 8 }],
      trades: [{ px: 101, qty: 5, side: 'buy' }],
      last: { px: 101, qty: 5, side: 'buy' },
    };
    const html = renderToString(<BookView data={data} />);
    expect(html).toContain('99');
    expect(html).toContain('101');
    expect(html).toContain('mid 100');
    expect(html).toContain('1 trades');
  });

  it('DeckView renders stack with top marker', () => {
    const data: DeckData = {
      type: 'deck',
      kind: 'stack',
      name: 'call stack',
      items: [{ v: 'f1', c: null }, { v: 'f2', c: 'focus' }],
      pointer: 1,
    };
    const html = renderToString(<DeckView data={data} />);
    expect(html).toContain('f2');
    expect(html).toContain('top');
    expect(html).toContain('deck-peek');
  });

  it('DeckView renders queue with front marker', () => {
    const data: DeckData = {
      type: 'deck',
      kind: 'queue',
      name: 'queue',
      items: [{ v: 1, c: null }, { v: 2, c: null }],
      pointer: 0,
    };
    const html = renderToString(<DeckView data={data} />);
    expect(html).toContain('front');
    expect(html).toContain('back');
  });

  it('FlowView renders stages, gauges, tokens, drops', () => {
    const data: FlowData = {
      type: 'flow',
      name: 'f',
      stages: [
        { id: 'src', label: 'source', q: 0, cap: null, c: null, drops: 0 },
        { id: 'q', label: 'queue', q: 7, cap: 8, c: null, drops: 2 },
        { id: 'sink', label: 'sink', q: 1, cap: 4, c: 'best', drops: 0 },
      ],
      edges: [
        { u: 0, v: 1, c: null },
        { u: 1, v: 2, c: null },
      ],
      tokens: [{ e: 0, pos: 0.5, c: null }],
      route: [0, 1, 2],
    };
    const html = renderToString(<FlowView data={data} />);
    expect(html).toContain('source');
    expect(html).toContain('7/8');
    expect(html).toContain('queue');
  });
});

describe('extended views', () => {
  it('TreeView renders annotations and multi-key nodes', () => {
    const data: TreeData = {
      type: 'tree',
      nodes: {
        n0: { v: 10, l: 'n1', r: null, keys: [5, 10, 15], c: ['n1', null] },
        n1: { v: 7, l: null, r: null },
      },
      root: 'n0',
      colors: { n0: null, n1: null },
      annot: { n1: 'visits=4' },
      tmp: [],
      counter: 2,
      mode: 'ordered',
    };
    const html = renderToString(<TreeView data={data} />);
    expect(html).toContain('visits=4');
    expect(html).toContain('15');
  });

  it('MatrixView linear scale interpolates colors', () => {
    const data: MatrixData = {
      type: 'matrix',
      values: [
        [0, 0.5],
        [0.8, 1],
      ],
      rowLabels: null,
      colLabels: null,
      colors: {},
      rowMix: null,
      colMix: null,
      scale: 'linear',
    };
    const html = renderToString(<MatrixView data={data} />);
    expect(html).toContain('0.80');
    expect(html).toContain('background-color');
  });

  it('StringView hides pattern row when empty', () => {
    const data: StringData = {
      type: 'str',
      text: '10110',
      pattern: '',
      offset: 0,
      tColors: [null, null, null, null, null],
      pColors: [],
      tmpT: {},
      tmpP: {},
      matches: [],
    };
    const html = renderToString(<StringView data={data} />);
    expect(html).toContain('text');
    expect(html).not.toContain('pattern (offset');
  });
});
