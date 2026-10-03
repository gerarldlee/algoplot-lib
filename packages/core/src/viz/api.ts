import type { Recorder } from '../recorder';
import type { Rng } from '../rng';
import { VizArray } from './array';
import { VizBook } from './book';
import { VizDeck } from './deck';
import { VizDist } from './distribution';
import { VizFlow } from './flow';
import { VizGantt } from './gantt';
import { VizGraph, type GraphSpec } from './graph';
import { VizGrid } from './grid';
import { VizList } from './list';
import { VizMatrix } from './matrix';
import { VizNet } from './net';
import { VizOctree } from './octree';
import { VizPlot } from './plot';
import { VizSequence } from './sequence';
import { VizString } from './string';
import { VizTree } from './tree';
import { VizTrie } from './trie';
import { VizUF } from './unionFind';

export class VizApi {
  private counter = 0;

  constructor(
    private rec: Recorder,
    private rng: Rng,
  ) {}

  private nextId(prefix: string): string {
    return `${prefix}${this.counter++}`;
  }

  array(values: unknown[], name?: string): VizArray {
    return new VizArray(this.rec, this.nextId('arr'), values, name);
  }

  list(values: unknown[], name?: string, doubly = false): VizList {
    return new VizList(this.rec, this.nextId('lst'), values, name, doubly);
  }

  graph(spec: GraphSpec): VizGraph {
    return new VizGraph(this.rec, this.nextId('gr'), spec);
  }

  tree(): VizTree {
    return new VizTree(this.rec, this.nextId('tr'));
  }

  trie(): VizTrie {
    return new VizTrie(this.rec, this.nextId('tre'));
  }

  grid(w: number, h: number): VizGrid {
    return new VizGrid(this.rec, this.nextId('gd'), w, h);
  }

  str(text: string, pattern = ''): VizString {
    return new VizString(this.rec, this.nextId('st'), text, pattern);
  }

  matrix(values: (number | string)[][], rowLabels?: string[], colLabels?: string[]): VizMatrix {
    return new VizMatrix(this.rec, this.nextId('mx'), values, rowLabels, colLabels);
  }

  dist(names: string[], values: number[]): VizDist {
    return new VizDist(this.rec, this.nextId('ds'), names, values);
  }

  uf(labels: string[]): VizUF {
    return new VizUF(this.rec, this.nextId('uf'), labels);
  }

  sequence(lanes: string[], name?: string): VizSequence {
    return new VizSequence(this.rec, this.nextId('sq'), lanes, name);
  }

  plot(name?: string): VizPlot {
    return new VizPlot(this.rec, this.nextId('pl'), name);
  }

  net(name?: string): VizNet {
    return new VizNet(this.rec, this.nextId('nt'), name);
  }

  octree(extent = 1): VizOctree {
    return new VizOctree(this.rec, this.nextId('oc'), extent);
  }

  gantt(rows: string[], name?: string): VizGantt {
    return new VizGantt(this.rec, this.nextId('gt'), rows, name);
  }

  book(name?: string): VizBook {
    return new VizBook(this.rec, this.nextId('bk'), name);
  }

  stack(values: unknown[] = [], name?: string): VizDeck {
    return new VizDeck(this.rec, this.nextId('dk'), 'stack', values, name);
  }

  queue(values: unknown[] = [], name?: string): VizDeck {
    return new VizDeck(this.rec, this.nextId('dk'), 'queue', values, name);
  }

  flow(name?: string): VizFlow {
    return new VizFlow(this.rec, this.nextId('fl'), name);
  }

  note(msg: string): void {
    this.rec.note(msg);
  }

  step(msg?: string): void {
    this.rec.step(msg);
  }

  log(msg: string): void {
    this.rec.log(msg);
  }

  metric(name: string, value: string | number): void {
    this.rec.metric(name, value);
  }

  batch<T>(fn: () => T): T {
    return this.rec.batch(fn);
  }

  random(): number {
    return this.rng.next();
  }

  randomInt(maxExclusive: number): number {
    return this.rng.int(maxExclusive);
  }

  shuffle<T>(arr: T[]): T[] {
    return this.rng.shuffle(arr);
  }
}
