import type { Recorder } from '../recorder';
import { Struct } from './base';

export type UFData = {
  type: 'uf';
  labels: string[];
  parent: Record<string, string | null>;
  rank: Record<string, number>;
  colors: Record<string, string | null>;
  path: string[];
}

export class VizUF extends Struct {
  declare readonly data: UFData;

  constructor(rec: Recorder, id: string, labels: string[]) {
    const parent: Record<string, string | null> = {};
    const rank: Record<string, number> = {};
    const colors: Record<string, string | null> = {};
    for (const l of labels) {
      parent[l] = null;
      rank[l] = 0;
      colors[l] = null;
    }
    const data: UFData = { type: 'uf', labels: labels.slice(), parent, rank, colors, path: [] };
    super(rec, id, data);
  }

  private clearTmp(): void {
    this.data.path = [];
  }

  private root(x: string): string {
    let cur = x;
    while (this.data.parent[cur] !== null) cur = this.data.parent[cur] as string;
    return cur;
  }

  find(x: string, compress = true): string {
    this.clearTmp();
    const chain = [x];
    let cur = x;
    while (this.data.parent[cur] !== null) {
      cur = this.data.parent[cur] as string;
      chain.push(cur);
    }
    const root = cur;
    for (let i = 0; i < chain.length; i++) {
      this.data.path = chain.slice(0, i + 1);
      for (let j = 0; j <= i; j++) this.data.colors[chain[j]] = 'find';
      const next = i + 1 < chain.length ? ` → ${chain[i + 1]}` : ' (root)';
      this.record(`find(${x}): ${chain[i]}${next}`);
    }
    if (compress && chain.length > 1) {
      for (let i = 0; i < chain.length - 1; i++) this.data.parent[chain[i]] = root;
      this.record(`path compression: ${chain.slice(0, -1).join(', ')} → parent = ${root}`);
    }
    this.data.path = [];
    for (const l of this.data.labels) this.data.colors[l] = null;
    this.record(`find(${x}) → root ${root}`);
    return root;
  }

  union(a: string, b: string): boolean {
    this.clearTmp();
    const ra = this.root(a);
    const rb = this.root(b);
    if (ra === rb) {
      this.record(`${a} and ${b} are already connected (root ${ra})`);
      return false;
    }
    const rankA = this.data.rank[ra];
    const rankB = this.data.rank[rb];
    this.data.colors[ra] = 'union';
    this.data.colors[rb] = 'union';
    if (rankA < rankB) {
      this.data.parent[ra] = rb;
      this.record(`union(${a}, ${b}): attach root ${ra} under ${rb} (rank ${rankA} < ${rankB})`);
    } else if (rankA > rankB) {
      this.data.parent[rb] = ra;
      this.record(`union(${a}, ${b}): attach root ${rb} under ${ra} (rank ${rankA} > ${rankB})`);
    } else {
      this.data.parent[rb] = ra;
      this.data.rank[ra] = rankA + 1;
      this.record(`union(${a}, ${b}): attach ${rb} under ${ra}, rank ${rankA} → ${rankA + 1}`);
    }
    for (const l of this.data.labels) this.data.colors[l] = null;
    this.record(`merged: ${ra} ∪ ${rb}`);
    return true;
  }

  connected(a: string, b: string): boolean {
    return this.root(a) === this.root(b);
  }

  color(l: string, c: string | null, msg?: string): void {
    this.data.colors[l] = c;
    this.record(msg ?? `${l}: ${c ?? 'clear'}`);
  }

  clearColors(msg?: string): void {
    for (const l of this.data.labels) this.data.colors[l] = null;
    this.record(msg ?? 'clear highlights');
  }
}
