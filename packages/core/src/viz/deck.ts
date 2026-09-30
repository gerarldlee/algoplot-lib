import type { Recorder } from '../recorder';
import { Struct } from './base';

export type DeckItem = { v: unknown; c: string | null };

export type DeckData = {
  type: 'deck';
  kind: 'stack' | 'queue';
  name: string;
  items: DeckItem[];
  pointer: number | null;
};

export class VizDeck extends Struct {
  declare readonly data: DeckData;

  constructor(rec: Recorder, id: string, kind: 'stack' | 'queue', values: unknown[], name?: string) {
    const data: DeckData = {
      type: 'deck',
      kind,
      name: name ?? kind,
      items: values.map((v) => ({ v, c: null })),
      pointer: null,
    };
    super(rec, id, data);
  }

  get size(): number {
    return this.data.items.length;
  }

  push(v: unknown, msg?: string): void {
    if (this.data.kind !== 'stack') throw new Error('push is only valid on a stack');
    this.data.items.push({ v, c: null });
    this.data.pointer = this.data.items.length - 1;
    this.record(msg ?? `push ${String(v)} (size ${this.data.items.length})`);
  }

  pop(msg?: string): unknown {
    if (this.data.kind !== 'stack') throw new Error('pop is only valid on a stack');
    if (this.data.items.length === 0) {
      this.record(msg ?? 'pop on empty stack');
      return undefined;
    }
    const it = this.data.items.pop()!;
    this.data.pointer = this.data.items.length - 1;
    this.record(msg ?? `pop ${String(it.v)} (size ${this.data.items.length})`);
    return it.v;
  }

  enqueue(v: unknown, msg?: string): void {
    if (this.data.kind !== 'queue') throw new Error('enqueue is only valid on a queue');
    this.data.items.push({ v, c: null });
    this.data.pointer = this.data.items.length - 1;
    this.record(msg ?? `enqueue ${String(v)} (size ${this.data.items.length})`);
  }

  dequeue(msg?: string): unknown {
    if (this.data.kind !== 'queue') throw new Error('dequeue is only valid on a queue');
    if (this.data.items.length === 0) {
      this.record(msg ?? 'dequeue on empty queue');
      return undefined;
    }
    const it = this.data.items.shift()!;
    this.data.pointer = 0;
    this.record(msg ?? `dequeue ${String(it.v)} (size ${this.data.items.length})`);
    return it.v;
  }

  peek(): unknown {
    if (this.data.items.length === 0) {
      this.record('peek on empty deck');
      return undefined;
    }
    this.data.pointer = this.data.kind === 'stack' ? this.data.items.length - 1 : 0;
    const it = this.data.items[this.data.pointer];
    this.record(`peek ${String(it.v)}`);
    return it.v;
  }

  markAt(i: number, c: string | null, msg?: string): void {
    if (this.data.items[i]) this.data.items[i].c = c;
    this.record(msg ?? `mark ${this.data.kind}[${i}]: ${c ?? 'none'}`);
  }

  clearMarks(msg?: string): void {
    for (const it of this.data.items) it.c = null;
    this.data.pointer = null;
    this.record(msg ?? 'clear marks');
  }
}
