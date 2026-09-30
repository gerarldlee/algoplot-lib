import type { Recorder } from '../recorder';
import { Struct } from './base';

export type DistData = {
  type: 'dist';
  names: string[];
  values: number[];
  colors: (string | null)[];
  evidence: string[];
}

export class VizDist extends Struct {
  declare readonly data: DistData;

  constructor(rec: Recorder, id: string, names: string[], values: number[]) {
    const data: DistData = {
      type: 'dist',
      names: names.slice(),
      values: values.slice(),
      colors: names.map(() => null),
      evidence: [],
    };
    super(rec, id, data);
  }

  get length(): number {
    return this.data.names.length;
  }

  at(i: number): number {
    return this.data.values[i];
  }

  set(i: number, v: number, msg?: string): void {
    this.data.values[i] = v;
    this.record(msg ?? `${this.data.names[i]} = ${v.toFixed(4)}`);
  }

  setAll(values: number[], msg?: string): void {
    this.data.values = values.slice();
    this.record(msg ?? 'update distribution');
  }

  normalize(msg?: string): void {
    const sum = this.data.values.reduce((a, b) => a + b, 0);
    if (sum > 0) this.data.values = this.data.values.map((v) => v / sum);
    this.record(msg ?? 'normalize to sum 1');
  }

  update(values: number[], msg: string): void {
    this.data.values = values.slice();
    this.record(msg);
  }

  color(i: number, c: string | null, msg?: string): void {
    this.data.colors[i] = c;
    this.record(msg ?? `${this.data.names[i]}: ${c ?? 'clear'}`);
  }

  clearColors(msg?: string): void {
    for (let i = 0; i < this.data.colors.length; i++) this.data.colors[i] = null;
    this.record(msg ?? 'clear highlights');
  }

  addEvidence(desc: string, msg?: string): void {
    this.data.evidence.push(desc);
    this.record(msg ?? `observe: ${desc}`);
  }

  sum(): number {
    return this.data.values.reduce((a, b) => a + b, 0);
  }
}
