import type { Recorder } from '../recorder';
import { Struct } from './base';

export type FlowStage = {
  id: string;
  label: string;
  q: number;
  cap: number | null;
  c: string | null;
  drops: number;
};

export type FlowData = {
  type: 'flow';
  name: string;
  stages: FlowStage[];
  edges: { u: number; v: number; c: string | null }[];
  tokens: { e: number; pos: number; c: string | null }[];
  route: number[] | null;
};

export class VizFlow extends Struct {
  declare readonly data: FlowData;

  constructor(rec: Recorder, id: string, name = 'flow') {
    const data: FlowData = { type: 'flow', name, stages: [], edges: [], tokens: [], route: null };
    super(rec, id, data);
  }

  private idx(id: string): number {
    const i = this.data.stages.findIndex((s) => s.id === id);
    if (i < 0) throw new Error(`unknown stage: ${id}`);
    return i;
  }

  stage(id: string, label = id, cap: number | null = null, msg?: string): this {
    this.data.stages.push({ id, label, q: 0, cap, c: null, drops: 0 });
    this.record(msg ?? `stage ${label}${cap !== null ? ` (cap ${cap})` : ''}`);
    return this;
  }

  has(id: string): boolean {
    return this.data.stages.some((s) => s.id === id);
  }

  edge(u: string, v: string, c: string | null = null, msg?: string): void {
    this.data.edges.push({ u: this.idx(u), v: this.idx(v), c });
    this.record(msg ?? `${u} → ${v}`);
  }

  enqueue(id: string, n = 1, msg?: string): void {
    const s = this.data.stages[this.idx(id)];
    s.q += n;
    this.record(msg ?? `${s.label} queue = ${s.q}${s.cap !== null ? `/${s.cap}` : ''}`);
  }

  dequeue(id: string, n = 1, msg?: string): void {
    const s = this.data.stages[this.idx(id)];
    s.q = Math.max(0, s.q - n);
    this.record(msg ?? `${s.label} queue = ${s.q}${s.cap !== null ? `/${s.cap}` : ''}`);
  }

  fill(id: string, q: number, msg?: string): void {
    const s = this.data.stages[this.idx(id)];
    s.q = Math.max(0, q);
    this.record(msg ?? `${s.label} queue = ${s.q}`);
  }

  colorStage(id: string, c: string | null, msg?: string): void {
    const s = this.data.stages[this.idx(id)];
    s.c = c;
    this.record(msg ?? `${s.label}: ${c ?? 'no color'}`);
  }

  send(u: string, v: string, c: string | null = null, msg?: string): void {
    const ui = this.idx(u);
    const ei = this.data.edges.findIndex((e) => e.u === ui && e.v === this.idx(v));
    if (ei < 0) throw new Error(`no edge ${u} → ${v}`);
    this.data.tokens.push({ e: ei, pos: 0, c });
    this.record(msg ?? `token ${u} → ${v}`);
  }

  /** Move in-flight tokens one notch; arrivals increment the target queue. */
  advance(msg?: string): void {
    const arrivals: number[] = [];
    const keep: FlowData['tokens'] = [];
    for (const tk of this.data.tokens) {
      tk.pos += 0.5;
      if (tk.pos >= 1) arrivals.push(this.data.edges[tk.e].v);
      else keep.push(tk);
    }
    if (arrivals.length > 0) {
      for (const si of arrivals) this.data.stages[si].q += 1;
      this.data.tokens = keep;
      this.record(
        msg ?? `delivered → ${arrivals.map((i) => this.data.stages[i].label).join(', ')}`,
      );
    } else {
      this.record(msg ?? 'advance');
    }
  }

  drop(id: string, n = 1, msg?: string): void {
    const s = this.data.stages[this.idx(id)];
    s.drops += n;
    this.record(msg ?? `${s.label} dropped ${n} (total ${s.drops})`);
  }

  route(stageIds: string[] | null, msg?: string): void {
    this.data.route = stageIds ? stageIds.map((s) => this.idx(s)) : null;
    this.record(msg ?? (stageIds ? `route: ${stageIds.join(' → ')}` : 'clear route'));
  }
}
