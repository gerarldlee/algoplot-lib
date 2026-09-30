import type { Recorder } from '../recorder';
import { Struct } from './base';

export interface TreeNode {
  v: number | string;
  l: string | null;
  r: string | null;
  keys?: (number | string)[];
  c?: (string | null)[];
}

export type TreeData = {
  type: 'tree';
  nodes: Record<string, TreeNode>;
  root: string | null;
  colors: Record<string, string | null>;
  annot: Record<string, string>;
  tmp: string[];
  counter: number;
  mode: 'binary' | 'ordered';
}

export class VizTree extends Struct {
  declare readonly data: TreeData;

  constructor(rec: Recorder, id: string) {
    const data: TreeData = {
      type: 'tree',
      nodes: {},
      root: null,
      colors: {},
      annot: {},
      tmp: [],
      counter: 0,
      mode: 'binary',
    };
    super(rec, id, data);
  }

  private clearTmp(): void {
    this.data.tmp = [];
  }

  private create(v: number | string): string {
    const id = `n${this.data.counter++}`;
    this.data.nodes[id] = { v, l: null, r: null };
    this.data.colors[id] = null;
    return id;
  }

  insert(v: number | string): string | null {
    this.clearTmp();
    if (this.data.root === null) {
      this.data.root = this.create(v);
      this.record(`insert ${v} as root`);
      return this.data.root;
    }
    let cur = this.data.root;
    for (;;) {
      const node = this.data.nodes[cur];
      this.data.tmp = [cur];
      const rel = v === node.v ? '=' : (v as never) < (node.v as never) ? '<' : '>';
      this.record(`compare ${v} ${rel} ${node.v}`);
      if (v === node.v) {
        this.data.tmp = [];
        this.record(`${v} already exists — ignore duplicate`);
        return null;
      }
      const goLeft = (v as never) < (node.v as never);
      const next = goLeft ? node.l : node.r;
      if (next === null) {
        const id = this.create(v);
        if (goLeft) node.l = id;
        else node.r = id;
        this.data.tmp = [id];
        this.record(`insert ${v} ${goLeft ? 'left' : 'right'} of ${node.v}`);
        this.data.tmp = [];
        return id;
      }
      cur = next;
    }
  }

  search(v: number | string): string | null {
    this.clearTmp();
    let cur = this.data.root;
    while (cur !== null) {
      const node = this.data.nodes[cur];
      this.data.tmp = [cur];
      const rel = v === node.v ? '=' : (v as never) < (node.v as never) ? '<' : '>';
      this.record(`compare ${v} ${rel} ${node.v}`);
      if (v === node.v) {
        this.data.tmp = [];
        this.data.colors[cur] = 'found';
        this.record(`found ${v}`);
        return cur;
      }
      cur = (v as never) < (node.v as never) ? node.l : node.r;
    }
    this.data.tmp = [];
    this.record(`${v} not found`);
    return null;
  }

  color(id: string, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.colors[id] = c;
    this.record(msg ?? `color ${id}: ${c ?? 'none'}`);
  }

  clearColors(msg?: string): void {
    this.clearTmp();
    for (const k of Object.keys(this.data.colors)) this.data.colors[k] = null;
    this.record(msg ?? 'clear colors');
  }

  annotate(id: string, text: string, msg?: string): void {
    if (!(id in this.data.nodes)) throw new Error(`unknown node: ${id}`);
    this.data.annot[id] = text;
    this.record(msg ?? `${id} annotated: ${text}`);
  }

  clearAnnots(msg?: string): void {
    this.data.annot = {};
    this.record(msg ?? 'clear annotations');
  }

  ordered(msg?: string): void {
    this.data.mode = 'ordered';
    this.record(msg ?? 'switch to ordered (n-ary) tree');
  }

  node(v: number | string, keys?: (number | string)[], msg?: string): string {
    if (keys !== undefined) this.data.mode = 'ordered';
    const id = `n${this.data.counter++}`;
    const node: TreeNode =
      keys === undefined
        ? { v, l: null, r: null }
        : { v, l: null, r: null, keys: keys.slice(), c: [] };
    this.data.nodes[id] = node;
    this.data.colors[id] = null;
    this.record(msg ?? `create node ${id}${keys ? ` keys [${keys.join(', ')}]` : ` = ${String(v)}`}`);
    return id;
  }

  setRoot(id: string | null, msg?: string): void {
    if (id !== null && !(id in this.data.nodes)) throw new Error(`unknown node: ${id}`);
    this.data.root = id;
    this.record(msg ?? `root ← ${id ?? 'null'}`);
  }

  setKeys(id: string, keys: (number | string)[], msg?: string): void {
    const n = this.data.nodes[id];
    if (!n) throw new Error(`unknown node: ${id}`);
    n.keys = keys.slice();
    n.v = keys[0] ?? '';
    this.record(msg ?? `${id} keys ← [${keys.join(', ')}]`);
  }

  link(parent: string, idx: number, child: string | null, msg?: string): void {
    const n = this.data.nodes[parent];
    if (!n) throw new Error(`unknown node: ${parent}`);
    if (!n.c) n.c = [];
    while (n.c.length <= idx) n.c.push(null);
    n.c[idx] = child;
    this.record(msg ?? `${parent}.child[${idx}] ← ${child ?? 'null'}`);
  }

  /**
   * Rewire both children of a node in one recorded step.
   *
   * Rotations need to move three links at once, and there is no public way to set
   * `l`/`r` on their own: writing `data.nodes[id].l` from a template mutates the world
   * without recording anything, so the change would be invisible in playback. It is
   * also not expressible from the Python bridge, whose proxy defines no `__setitem__`
   * (see `bridge.py`), so a rotation could not be ported at all. One method that owns
   * both links keeps the mutation recorded on either side of the bridge.
   */
  setChildren(id: string, l: string | null, r: string | null, msg?: string): void {
    const n = this.data.nodes[id];
    if (!n) throw new Error(`unknown node: ${id}`);
    // "No child" is stored as null, never as undefined. Python's `None` crosses the
    // bridge as JavaScript `undefined` (see `bridge.py`), and `JSON.stringify` drops an
    // undefined value where it keeps an explicit null — so a port would produce a node
    // missing a key the JavaScript run has, and the parity check would fail.
    n.l = l ?? null;
    n.r = r ?? null;
    this.record(msg ?? `${id}: left ← ${n.l ?? 'null'}, right ← ${n.r ?? 'null'}`);
  }

  size(): number {
    return Object.keys(this.data.nodes).length;
  }
}
