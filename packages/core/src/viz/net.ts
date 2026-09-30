import type { Recorder } from '../recorder';
import { Struct } from './base';

export type NetLayer = { id: string; label: string; n: number };

export type NetData = {
  type: 'net';
  name: string;
  layers: NetLayer[];
  act: Record<string, (number | null)[]>;
  w: Record<string, number[][]>;
  flow: Record<string, 'fwd' | 'bwd' | null>;
};

export class VizNet extends Struct {
  declare readonly data: NetData;

  constructor(rec: Recorder, id: string, name = 'net') {
    const data: NetData = { type: 'net', name, layers: [], act: {}, w: {}, flow: {} };
    super(rec, id, data);
  }

  layer(id: string, n: number, label = id, msg?: string): this {
    this.data.layers.push({ id, label, n });
    this.data.act[id] = Array(n).fill(null);
    this.data.flow[id] = null;
    this.record(msg ?? `layer ${label} (${n} units)`);
    return this;
  }

  has(id: string): boolean {
    return this.data.layers.some((l) => l.id === id);
  }

  set(layerId: string, i: number, v: number | null, msg?: string): void {
    const a = this.data.act[layerId];
    if (!a) throw new Error(`unknown layer: ${layerId}`);
    a[i] = v;
    this.record(msg ?? `${layerId}[${i}] = ${v === null ? '—' : v.toFixed(2)}`);
  }

  setAll(layerId: string, vs: (number | null)[], msg?: string): void {
    const a = this.data.act[layerId];
    if (!a) throw new Error(`unknown layer: ${layerId}`);
    this.data.act[layerId] = vs.slice(0, a.length);
    this.record(msg ?? `${layerId} ← [${vs.map((v) => (v === null ? '—' : v.toFixed(2))).join(', ')}]`);
  }

  weight(layerId: string, i: number, j: number, w: number, msg?: string): void {
    let m = this.data.w[layerId];
    if (!m) {
      const layer = this.data.layers.find((l) => l.id === layerId);
      if (!layer) throw new Error(`unknown layer: ${layerId}`);
      const next = this.data.layers[this.data.layers.indexOf(layer) + 1];
      if (!next) throw new Error(`layer ${layerId} has no successor`);
      m = Array.from({ length: layer.n }, () => Array(next.n).fill(0));
      this.data.w[layerId] = m;
    }
    m[i][j] = w;
    this.record(msg ?? `w ${layerId}[${i}→${j}] = ${w.toFixed(2)}`);
  }

  flow(layerId: string, dir: 'fwd' | 'bwd' | null, msg?: string): void {
    this.data.flow[layerId] = dir;
    this.record(msg ?? (dir === null ? `clear flow ${layerId}` : `flow ${layerId}: ${dir}`));
  }

  clearFlow(msg?: string): void {
    for (const k of Object.keys(this.data.flow)) this.data.flow[k] = null;
    this.record(msg ?? 'clear flow');
  }
}
