import type { Recorder } from '../recorder';
import { Struct } from './base';

export type GanttBar = {
  row: number;
  start: number;
  end: number;
  c: string | null;
  label?: string;
};

export type GanttData = {
  type: 'gantt';
  name: string;
  rows: string[];
  bars: GanttBar[];
  cursor: number | null;
  marks: number[];
  horizon: number;
};

export class VizGantt extends Struct {
  declare readonly data: GanttData;

  constructor(rec: Recorder, id: string, rows: string[], name = 'schedule') {
    const data: GanttData = {
      type: 'gantt',
      name,
      rows: rows.slice(),
      bars: [],
      cursor: null,
      marks: [],
      horizon: Math.max(10, rows.length * 4),
    };
    super(rec, id, data);
  }

  private rowIndex(who: string | number): number {
    const i = typeof who === 'number' ? who : this.data.rows.indexOf(who);
    if (i < 0 || i >= this.data.rows.length) throw new Error(`unknown row: ${String(who)}`);
    return i;
  }

  bar(who: string | number, start: number, end: number, c: string | null = 'focus', label?: string, msg?: string): void {
    const r = this.rowIndex(who);
    this.data.bars.push(label === undefined ? { row: r, start, end, c } : { row: r, start, end, c, label });
    this.data.horizon = Math.max(this.data.horizon, end + 2);
    this.record(msg ?? `${this.data.rows[r]}: [${start}, ${end}) ${label ?? ''}`.trim());
  }

  cursor(t: number | null, msg?: string): void {
    this.data.cursor = t;
    this.record(msg ?? (t === null ? 'clear cursor' : `t = ${t}`));
  }

  mark(t: number, msg?: string): void {
    if (!this.data.marks.includes(t)) this.data.marks.push(t);
    this.record(msg ?? `context switch at t=${t}`);
  }

  clearColors(c: string | null, msg?: string): void {
    for (const b of this.data.bars) b.c = c;
    this.record(msg ?? 'recolor bars');
  }
}
