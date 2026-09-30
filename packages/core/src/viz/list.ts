import type { Recorder } from '../recorder';
import { Struct } from './base';

export type ListData = {
  type: 'list';
  name: string;
  values: unknown[];
  colors: (string | null)[];
  tmp: (string | null)[];
  ptr: { name: string; i: number | null }[];
  doubly: boolean;
}

export class VizList extends Struct {
  declare readonly data: ListData;

  constructor(rec: Recorder, id: string, values: unknown[], name = 'list', doubly = false) {
    const data: ListData = {
      type: 'list',
      name,
      values: values.slice(),
      colors: values.map(() => null),
      tmp: values.map(() => null),
      ptr: [],
      doubly,
    };
    super(rec, id, data);
  }

  get length(): number {
    return this.data.values.length;
  }

  at(i: number): unknown {
    return this.data.values[i];
  }

  set(i: number, v: unknown, msg?: string): void {
    this.data.values[i] = v;
    this.record(msg ?? `node ${i} ← ${String(v)}`);
  }

  swap(i: number, j: number, msg?: string): void {
    const a = this.data.values[i];
    this.data.values[i] = this.data.values[j];
    this.data.values[j] = a;
    const ca = this.data.colors[i];
    this.data.colors[i] = this.data.colors[j];
    this.data.colors[j] = ca;
    this.record(msg ?? `swap nodes ${i} ↔ ${j} (${String(a)} ↔ ${String(this.data.values[i])})`);
  }

  insertAt(i: number, v: unknown, msg?: string): void {
    this.data.values.splice(i, 0, v);
    this.data.colors.splice(i, 0, null);
    this.data.tmp.splice(i, 0, null);
    this.data.ptr = this.data.ptr.map((p) =>
      p.i !== null && p.i >= i ? { ...p, i: p.i + 1 } : p,
    );
    this.record(msg ?? `insert ${String(v)} at position ${i}`);
  }

  removeAt(i: number, msg?: string): unknown {
    const v = this.data.values.splice(i, 1)[0];
    this.data.colors.splice(i, 1);
    this.data.tmp.splice(i, 1);
    this.data.ptr = this.data.ptr.map((p) =>
      p.i !== null && p.i > i ? { ...p, i: p.i - 1 } : p,
    );
    this.record(msg ?? `remove node ${i} (${String(v)})`);
    return v;
  }

  private clearTmp(): void {
    this.data.tmp = this.data.values.map(() => null);
    this.data.ptr = [];
  }

  setPointer(name: string, i: number | null): void {
    this.clearTmp();
    // Normalise: the declared type is number | null, but a caller (or a bridge that
    // cannot express a JS null) can hand us undefined, which would drop the key from
    // the struct data instead of storing null.
    const at = i ?? null;
    this.data.ptr.push({ name, i: at });
    this.record(`pointer ${name} → ${at === null ? 'null' : `node ${at}`}`);
  }

  visit(i: number, msg?: string): unknown {
    this.clearTmp();
    this.data.tmp[i] = 'focus';
    this.data.colors[i] = 'visited';
    this.data.ptr.push({ name: 'curr', i });
    this.record(msg ?? `visit node ${i} (value ${String(this.data.values[i])})`);
    return this.data.values[i];
  }

  peek(i: number, msg?: string): unknown {
    this.clearTmp();
    this.data.tmp[i] = 'focus';
    this.data.ptr.push({ name: 'curr', i });
    this.record(msg ?? `read node ${i}`);
    return this.data.values[i];
  }

  mark(i: number, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.colors[i] = c;
    this.record(msg);
  }

  clearMarks(msg?: string): void {
    this.clearTmp();
    for (let i = 0; i < this.data.colors.length; i++) this.data.colors[i] = null;
    this.record(msg ?? 'clear marks');
  }
}
