import type { Recorder } from '../recorder';
import { Struct } from './base';

export type MatrixData = {
  type: 'matrix';
  values: (number | string)[][];
  rowLabels: string[] | null;
  colLabels: string[] | null;
  colors: Record<string, string | null>;
  rowMix: number[] | null;
  colMix: number[] | null;
  scale: 'categorical' | 'linear';
}

export class VizMatrix extends Struct {
  declare readonly data: MatrixData;

  constructor(
    rec: Recorder,
    id: string,
    values: (number | string)[][],
    rowLabels?: string[],
    colLabels?: string[],
  ) {
    const data: MatrixData = {
      type: 'matrix',
      values: values.map((r) => r.slice()),
      rowLabels: rowLabels ?? null,
      colLabels: colLabels ?? null,
      colors: {},
      rowMix: null,
      colMix: null,
      scale: 'categorical',
    };
    super(rec, id, data);
  }

  setScale(mode: 'categorical' | 'linear', msg?: string): void {
    this.data.scale = mode;
    this.record(msg ?? `scale = ${mode}`);
  }

  get rows(): number {
    return this.data.values.length;
  }

  get cols(): number {
    return this.data.values[0]?.length ?? 0;
  }

  private clearColors(): void {
    this.data.colors = {};
  }

  at(r: number, c: number): number | string {
    return this.data.values[r][c];
  }

  set(r: number, c: number, v: number | string, msg?: string): void {
    this.data.values[r][c] = v;
    this.record(msg ?? `cell (${r},${c}) = ${v}`);
  }

  color(r: number, c: number, col: string, msg?: string): void {
    this.data.colors[`${r},${c}`] = col;
    this.record(msg ?? `highlight cell (${r},${c}): ${col}`);
  }

  colorRow(r: number, col: string | null, msg?: string): void {
    for (let c = 0; c < this.cols; c++) this.data.colors[`${r},${c}`] = col;
    this.record(msg ?? `highlight row ${r}: ${col ?? 'clear'}`);
  }

  colorCol(c: number, col: string | null, msg?: string): void {
    for (let r = 0; r < this.rows; r++) this.data.colors[`${r},${c}`] = col;
    this.record(msg ?? `highlight col ${c}: ${col ?? 'clear'}`);
  }

  clearHighlights(msg?: string): void {
    this.clearColors();
    this.record(msg ?? 'clear highlights');
  }

  setRowMix(p: number[] | null, msg?: string): void {
    this.data.rowMix = p;
    this.record(msg ?? `row mix = ${p ? p.map((x) => x.toFixed(2)).join(', ') : 'pure'}`);
  }

  setColMix(p: number[] | null, msg?: string): void {
    this.data.colMix = p;
    this.record(msg ?? `col mix = ${p ? p.map((x) => x.toFixed(2)).join(', ') : 'pure'}`);
  }
}
