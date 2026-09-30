import type { Recorder } from '../recorder';
import { Struct } from './base';

export type StringData = {
  type: 'str';
  text: string;
  pattern: string;
  offset: number;
  tColors: (string | null)[];
  pColors: (string | null)[];
  tmpT: Record<number, string>;
  tmpP: Record<number, string>;
  matches: number[];
}

export class VizString extends Struct {
  declare readonly data: StringData;

  constructor(rec: Recorder, id: string, text: string, pattern = '') {
    const data: StringData = {
      type: 'str',
      text,
      pattern,
      offset: 0,
      tColors: text.split('').map(() => null),
      pColors: pattern.split('').map(() => null),
      tmpT: {},
      tmpP: {},
      matches: [],
    };
    super(rec, id, data);
  }

  private clearTmp(): void {
    this.data.tmpT = {};
    this.data.tmpP = {};
  }

  align(shift: number, msg?: string): void {
    this.clearTmp();
    this.data.offset = shift;
    this.record(msg ?? `align pattern at text[${shift}]`);
  }

  colorText(i: number, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.tColors[i] = c;
    this.record(msg ?? `text[${i}]: ${c ?? 'clear'}`);
  }

  colorPattern(i: number, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.pColors[i] = c;
    this.record(msg ?? `pattern[${i}]: ${c ?? 'clear'}`);
  }

  compareAt(i: number, msg?: string): number {
    this.clearTmp();
    const ti = this.data.offset + i;
    const tc = this.data.text[ti];
    const pc = this.data.pattern[i];
    this.data.tmpT[ti] = 'cmp';
    this.data.tmpP[i] = 'cmp';
    const cmp = tc === pc ? 0 : tc === undefined ? -1 : pc === undefined ? 1 : tc < pc ? -1 : 1;
    const rel = cmp === 0 ? '=' : '<';
    this.record(msg ?? `text[${ti}]='${tc ?? '\u2200'}' ${rel} pattern[${i}]='${pc ?? '\u2200'}'`);
    return cmp;
  }

  compareT(ti: number, pi: number, msg?: string): number {
    this.clearTmp();
    const tc = this.data.text[ti];
    const pc = this.data.pattern[pi];
    const same = tc === pc && tc !== undefined;
    this.data.tmpT[ti] = same ? 'match' : 'mismatch';
    this.data.tmpP[pi] = same ? 'match' : 'mismatch';
    this.record(
      msg ??
        `text[${ti}]='${tc ?? '\u2200'}' vs pattern[${pi}]='${pc ?? '\u2200'}' — ${same ? 'match' : 'mismatch'}`,
    );
    return same ? 0 : 1;
  }

  tmpText(i: number, c: string, msg?: string): void {
    this.clearTmp();
    this.data.tmpT[i] = c;
    this.record(msg ?? `text[${i}]: ${c}`);
  }

  tmpPattern(i: number, c: string, msg?: string): void {
    this.clearTmp();
    this.data.tmpP[i] = c;
    this.record(msg ?? `pattern[${i}]: ${c}`);
  }

  match(start: number, msg?: string): void {
    this.clearTmp();
    if (!this.data.matches.includes(start)) this.data.matches.push(start);
    this.record(msg ?? `match at index ${start}`);
  }

  clearColors(msg?: string): void {
    this.clearTmp();
    this.data.tColors = this.data.tColors.map(() => null);
    this.data.pColors = this.data.pColors.map(() => null);
    this.record(msg ?? 'clear colors');
  }
}
