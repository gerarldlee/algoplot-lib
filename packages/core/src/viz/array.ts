import type { Recorder } from '../recorder';
import { Struct } from './base';

export interface ArrayRange {
  lo: number;
  hi: number;
  c: string;
  label?: string;
}

export type ArrayData = {
  type: 'array';
  name: string;
  values: unknown[];
  colors: (string | null)[];
  tmp: (string | null)[];
  ranges: ArrayRange[];
  showIndex: boolean;
}

export class VizArray extends Struct {
  declare readonly data: ArrayData;

  constructor(rec: Recorder, id: string, values: unknown[], name = 'a') {
    const data: ArrayData = {
      type: 'array',
      name,
      values: values.slice(),
      colors: values.map(() => null),
      tmp: values.map(() => null),
      ranges: [],
      showIndex: true,
    };
    super(rec, id, data);
  }

  get length(): number {
    return this.data.values.length;
  }

  at(i: number): unknown {
    return this.data.values[i];
  }

  get(i: number): unknown {
    return this.data.values[i];
  }

  toArray(): unknown[] {
    return this.data.values.slice();
  }

  private clearTmp(): void {
    this.data.tmp = this.data.values.map(() => null);
  }

  private label(i: number): string {
    return `${this.data.name}[${i}]`;
  }

  compare(i: number, j: number, msg?: string): number {
    this.clearTmp();
    this.data.tmp[i] = 'cmp';
    this.data.tmp[j] = 'cmp';
    const a = this.data.values[i];
    const b = this.data.values[j];
    const cmp = a === b ? 0 : (a as never) > (b as never) ? 1 : -1;
    const rel = cmp > 0 ? '>' : cmp < 0 ? '<' : '=';
    this.record(msg ?? `compare ${this.label(i)}=${fmt(a)} ${rel} ${this.label(j)}=${fmt(b)}`);
    return cmp;
  }

  peek(i: number, msg?: string): unknown {
    this.clearTmp();
    this.data.tmp[i] = 'focus';
    this.record(msg ?? `look at ${this.label(i)}=${fmt(this.data.values[i])}`);
    return this.data.values[i];
  }

  swap(i: number, j: number, msg?: string): void {
    this.clearTmp();
    const vals = this.data.values;
    [vals[i], vals[j]] = [vals[j], vals[i]];
    this.record(msg ?? `swap ${this.label(i)}, ${this.label(j)}`);
  }

  set(i: number, v: unknown, msg?: string): void {
    this.clearTmp();
    this.data.values[i] = v;
    this.record(msg ?? `set ${this.label(i)} = ${fmt(v)}`);
  }

  fill(values: unknown[], msg?: string): void {
    this.data.values = values.slice();
    this.data.colors = values.map(() => null);
    this.clearTmp();
    this.record(msg ?? 'fill array');
  }

  mark(i: number, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.colors[i] = c;
    this.record(msg);
  }

  markAll(c: string | null, msg?: string): void {
    this.clearTmp();
    for (let i = 0; i < this.data.colors.length; i++) this.data.colors[i] = c;
    this.record(msg ?? `mark all ${c ?? 'clear'}`);
  }

  clearMarks(msg?: string): void {
    this.markAll(null, msg ?? 'clear marks');
  }

  range(lo: number, hi: number, c: string, label?: string, msg?: string): void {
    this.clearTmp();
    const rs = this.data.ranges.filter((r) => r.c !== c);
    rs.push({ lo, hi, c, label });
    this.data.ranges = rs;
    this.record(msg ?? (label ? `range [${lo}..${hi}] ${label}` : `range [${lo}..${hi}]`));
  }

  clearRanges(msg?: string): void {
    this.clearTmp();
    this.data.ranges = [];
    this.record(msg ?? 'clear ranges');
  }
}

function fmt(v: unknown): string {
  if (typeof v === 'string') return `'${v}'`;
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
