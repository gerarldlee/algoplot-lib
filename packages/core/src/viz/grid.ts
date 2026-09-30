import type { Recorder } from '../recorder';
import { Struct } from './base';

interface Cell {
  v: string | null;
  c: string | null;
}

export type GridData = {
  type: 'grid';
  w: number;
  h: number;
  cells: Cell[];
  tmp: Record<string, string>;
}

export class VizGrid extends Struct {
  declare readonly data: GridData;

  constructor(rec: Recorder, id: string, w: number, h: number) {
    const cells: Cell[] = [];
    for (let i = 0; i < w * h; i++) cells.push({ v: null, c: null });
    const data: GridData = { type: 'grid', w, h, cells, tmp: {} };
    super(rec, id, data);
  }

  get width(): number {
    return this.data.w;
  }

  get height(): number {
    return this.data.h;
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  private clearTmp(): void {
    this.data.tmp = {};
  }

  at(x: number, y: number): string | null {
    return this.data.cells[y * this.data.w + x].v;
  }

  set(x: number, y: number, v: string | null, msg?: string): void {
    this.clearTmp();
    this.data.cells[y * this.data.w + x].v = v;
    this.record(msg ?? `cell (${x},${y}) = ${v === null ? 'empty' : v}`);
  }

  color(x: number, y: number, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.cells[y * this.data.w + x].c = c;
    this.record(msg ?? `cell (${x},${y}): ${c ?? 'clear'}`);
  }

  tmpColor(x: number, y: number, c: string, msg?: string): void {
    this.data.tmp[this.key(x, y)] = c;
    this.record(msg ?? `highlight (${x},${y}): ${c}`);
  }

  clearColors(msg?: string): void {
    this.clearTmp();
    for (const cell of this.data.cells) cell.c = null;
    this.record(msg ?? 'clear highlights');
  }

  toArray(): (string | null)[][] {
    const out: (string | null)[][] = [];
    for (let y = 0; y < this.data.h; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < this.data.w; x++) row.push(this.data.cells[y * this.data.w + x].v);
      out.push(row);
    }
    return out;
  }
}
