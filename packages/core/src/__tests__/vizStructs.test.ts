import { describe, expect, it } from 'vitest';
import { materializeAt } from '../materialize';
import { runCode } from '../run';

function run(code: string, input: unknown = {}) {
  const out = runCode(code, input, { maxSteps: 5000, maxMs: 5000 });
  if (!out.ok) throw new Error(out.error?.message ?? 'run failed');
  return out;
}

describe('sequence structure', () => {
  it('records sends, actions, lock acquire/release', () => {
    const out = run(`
      const sq = viz.sequence(['alice', 'bob']);
      sq.send('alice', 'bob', 'ping');
      sq.action('bob', 'compute');
      sq.acquire('lock', 'bob');
      sq.release('lock');
      sq.hold('alice', 'waiting');
    `);
    const s = out.world.structs['sq0'] as unknown as {
      events: unknown[];
      locks: { name: string; owner: number | null }[];
      t: number;
    };
    expect(s.events.length).toBe(3);
    expect(s.t).toBe(3);
    expect(s.locks[0].owner).toBeNull();
    expect(out.steps.length).toBeGreaterThanOrEqual(5);
  });
});

describe('plot structure', () => {
  it('samples curves into serializable polylines', () => {
    const out = run(`
      const p = viz.plot();
      p.domain(0, 10, 0, 100);
      p.curve('sq', (x) => x * x, 'cmp');
      p.point(5, 25, 'focus', 'min');
      p.step(4, 16);
      p.step(5, 25);
    `);
    const d = out.world.structs['pl0'] as unknown as {
      polys: { id: string; pts: [number, number][] }[];
      trail: [number, number][];
    };
    expect(d.polys[0].pts.length).toBeGreaterThan(50);
    expect(d.trail.length).toBe(2);
  });
});

describe('net structure', () => {
  it('records activations, weights, flow', () => {
    const out = run(`
      const n = viz.net();
      n.layer('in', 2, 'input');
      n.layer('out', 1, 'output');
      n.set('in', 0, 0.7);
      n.setAll('out', [0.4]);
      n.weight('in', 0, 0, 1.5);
      n.flow('in', 'fwd');
      n.flow('in', null);
    `);
    const d = out.world.structs['nt0'] as unknown as {
      act: Record<string, (number | null)[]>;
      flow: Record<string, string | null>;
    };
    expect(d.act['in'][0]).toBe(0.7);
    expect(d.flow['in']).toBeNull();
  });
});

describe('gantt structure', () => {
  it('records bars, cursor, context-switch marks', () => {
    const out = run(`
      const g = viz.gantt(['p1', 'p2']);
      g.bar('p1', 0, 3, 'focus', 'A');
      g.mark(3);
      g.bar('p2', 3, 6, 'best', 'B');
      g.cursor(4);
    `);
    const d = out.world.structs['gt0'] as unknown as { bars: unknown[]; marks: number[] };
    expect(d.bars.length).toBe(2);
    expect(d.marks).toEqual([3]);
  });
});

describe('book structure', () => {
  it('matches market orders against resting liquidity', () => {
    const out = run(`
      const b = viz.book();
      b.limit('buy', 100, 10);
      b.limit('buy', 99, 5);
      b.limit('sell', 101, 8);
      b.limit('sell', 102, 5);
      const filled = b.market('buy', 12);
      viz.metric('filled', filled);
      viz.metric('bestBid', b.bestBid());
      viz.metric('mid', b.mid());
    `);
    const d = out.world.structs['bk0'] as unknown as {
      bids: { px: number; qty: number }[];
      asks: { px: number; qty: number }[];
      trades: { qty: number }[];
    };
    expect(out.world.metrics['filled']).toBe(12);
    expect(d.asks).toEqual([{ px: 102, qty: 1 }]);
    expect(d.trades.reduce((a, t) => a + t.qty, 0)).toBe(12);
    expect(d.bids[0].qty).toBe(10);
    expect(out.world.metrics['mid']).toBe(101);
  });
});

describe('deck structures', () => {
  it('stack push/pop and queue enqueue/dequeue', () => {
    const out = run(`
      const st = viz.stack([1]);
      st.push(2);
      st.pop();
      const q = viz.queue(['a']);
      q.enqueue('b');
      q.dequeue();
    `);
    const st = out.world.structs['dk0'] as unknown as { items: { v: number }[] };
    const q = out.world.structs['dk1'] as unknown as { items: { v: string }[] };
    expect(st.items.map((i) => i.v)).toEqual([1]);
    expect(q.items.map((i) => i.v)).toEqual(['b']);
  });
});

describe('flow structure', () => {
  it('advances tokens and increments destination queues on arrival', () => {
    const out = run(`
      const f = viz.flow();
      f.stage('src', 'source');
      f.stage('sink', 'sink', 4);
      f.edge('src', 'sink');
      f.send('src', 'sink');
      f.advance();
      viz.metric('sinkQ', f.data.stages[1].q);
      f.advance();
      viz.metric('sinkQ2', f.data.stages[1].q);
      f.drop('sink', 2);
    `);
    expect(out.world.metrics['sinkQ']).toBe(0);
    expect(out.world.metrics['sinkQ2']).toBe(1);
    const d = out.world.structs['fl0'] as unknown as {
      stages: { q: number; drops: number }[];
      tokens: unknown[];
    };
    expect(d.tokens.length).toBe(0);
    expect(d.stages[1].drops).toBe(2);
  });
});

describe('list extensions', () => {
  it('set, swap, insert, remove on doubly-linked list', () => {
    const out = run(`
      const l = viz.list([3, 1, 2], 'dll', true);
      l.swap(0, 1);
      l.set(2, 9);
      l.insertAt(0, 0);
      l.removeAt(3);
    `);
    const d = out.world.structs['lst0'] as unknown as { values: number[]; doubly: boolean };
    expect(d.values).toEqual([0, 1, 3]);
    expect(d.doubly).toBe(true);
  });
});

describe('tree extensions', () => {
  it('ordered mode with keys, links, annotations', () => {
    const out = run(`
      const t = viz.tree();
      t.ordered();
      const root = t.node(10, [10]);
      const a = t.node(5, [4, 6]);
      t.setRoot(root);
      t.link(root, 0, a);
      t.annotate(a, 'split!');
    `);
    const d = out.world.structs['tr0'] as unknown as {
      mode: string;
      root: string;
      annot: Record<string, string>;
      nodes: Record<string, { c?: (string | null)[]; keys?: number[] }>;
    };
    expect(d.mode).toBe('ordered');
    expect(d.nodes[d.root].c?.[0]).toBe('n1');
    expect(d.annot['n1']).toBe('split!');
    expect(d.nodes['n1'].keys).toEqual([4, 6]);
  });
});

describe('graph edge labels', () => {
  it('labels edges with residual flow text', () => {
    const out = run(`
      const g = viz.graph({ nodes: ['a', 'b'], edges: [['a', 'b', 3]], directed: true });
      g.labelEdge('a', 'b', 'f=2/c=3');
    `);
    const d = out.world.structs['gr0'] as unknown as { edgeLabel: Record<string, string> };
    expect(d.edgeLabel['a→b']).toBe('f=2/c=3');
  });
});

describe('trie tags', () => {
  it('tags nodes with hashes', () => {
    const out = run(`
      const t = viz.trie();
      t.insert('ab');
      t.tag('ab', '0x7f3a');
      t.tag('', 'root');
    `);
    const d = out.world.structs['tre0'] as unknown as { nodes: { path: string; tag: string }[] };
    const ab = d.nodes.find((n) => n.path === 'ab')!;
    expect(ab.tag).toBe('0x7f3a');
  });
});

describe('matrix scale', () => {
  it('linear scale renders numeric ramp', () => {
    const out = run(`
      const m = viz.matrix([[0, 1], [0.5, 0.25]]);
      m.setScale('linear');
      m.color(0, 0, 'best');
    `);
    const d = out.world.structs['mx0'] as unknown as { scale: string; colors: Record<string, string> };
    expect(d.scale).toBe('linear');
    expect(d.colors['0,0']).toBe('best');
  });
});

describe('string without pattern', () => {
  it('renders single row for bit streams', () => {
    const out = run(`
      const s = viz.str('10110');
      s.colorText(0, 'match');
    `);
    const d = out.world.structs['st0'] as unknown as { pattern: string; tColors: (string | null)[] };
    expect(d.pattern).toBe('');
    expect(d.tColors[0]).toBe('match');
  });
});

describe('replay determinism', () => {
  it('replays a multi-structure run exactly', () => {
    const out = run(`
      const sq = viz.sequence(['a', 'b']);
      const p = viz.plot();
      p.point(1, 2);
      const f = viz.flow();
      f.stage('x', 'x');
      f.stage('y', 'y');
      f.edge('x', 'y');
      f.send('x', 'y');
      f.advance();
      f.advance();
      sq.send('a', 'b', 'hi');
      p.step(1, 2);
    `);
    const replayed = materializeAt(out.keyframes, out.steps, out.steps.length);
    expect(replayed).toEqual(out.world);
  });
});
