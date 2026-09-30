import type { Recorder } from '../recorder';
import { Struct } from './base';

export type SeqEvent =
  | { k: 'msg'; from: number; to: number; label: string; t: number }
  | { k: 'self'; lane: number; label: string; t: number }
  | { k: 'hold'; lane: number; label: string; t: number };

export type SeqData = {
  type: 'sequence';
  name: string;
  lanes: string[];
  events: SeqEvent[];
  locks: { name: string; owner: number | null }[];
  t: number;
};

export class VizSequence extends Struct {
  declare readonly data: SeqData;

  constructor(rec: Recorder, id: string, lanes: string[], name = 'sequence') {
    const data: SeqData = {
      type: 'sequence',
      name,
      lanes: lanes.slice(),
      events: [],
      locks: [],
      t: 0,
    };
    super(rec, id, data);
  }

  private laneIndex(who: string | number): number {
    const i = typeof who === 'number' ? who : this.data.lanes.indexOf(who);
    if (i < 0 || i >= this.data.lanes.length) throw new Error(`unknown lane: ${String(who)}`);
    return i;
  }

  send(from: string | number, to: string | number, label: string, msg?: string): void {
    const f = this.laneIndex(from);
    const t = this.laneIndex(to);
    this.data.events.push({ k: 'msg', from: f, to: t, label, t: this.data.t++ });
    this.record(msg ?? `${this.data.lanes[f]} → ${this.data.lanes[t]}: ${label}`);
  }

  action(who: string | number, label: string, msg?: string): void {
    const l = this.laneIndex(who);
    this.data.events.push({ k: 'self', lane: l, label, t: this.data.t++ });
    this.record(msg ?? `${this.data.lanes[l]}: ${label}`);
  }

  hold(who: string | number, label: string, msg?: string): void {
    const l = this.laneIndex(who);
    this.data.events.push({ k: 'hold', lane: l, label, t: this.data.t++ });
    this.record(msg ?? `${this.data.lanes[l]} holds: ${label}`);
  }

  acquire(lockName: string, who: string | number, msg?: string): void {
    const l = this.laneIndex(who);
    const existing = this.data.locks.find((x) => x.name === lockName);
    if (existing) existing.owner = l;
    else this.data.locks.push({ name: lockName, owner: l });
    this.record(msg ?? `${this.data.lanes[l]} acquires ${lockName}`);
  }

  release(lockName: string, msg?: string): void {
    const existing = this.data.locks.find((x) => x.name === lockName);
    if (existing) {
      const prev = existing.owner;
      existing.owner = null;
      this.record(
        msg ?? `${prev === null ? '?' : this.data.lanes[prev]} releases ${lockName}`,
      );
    }
  }

  tick(n = 1, msg?: string): void {
    this.data.t += n;
    this.record(msg);
  }
}
