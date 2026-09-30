import type { Recorder } from '../recorder';
import { Struct } from './base';

interface TrieNode {
  id: string;
  path: string;
  terminal: boolean;
  color: string | null;
  tag: string;
}

export type TrieData = {
  type: 'trie';
  nodes: TrieNode[];
  tmp: string | null;
  counter: number;
}

export class VizTrie extends Struct {
  declare readonly data: TrieData;

  constructor(rec: Recorder, id: string) {
    const data: TrieData = {
      type: 'trie',
      nodes: [{ id: 't0', path: '', terminal: false, color: null, tag: '' }],
      tmp: null,
      counter: 1,
    };
    super(rec, id, data);
  }

  private find(path: string): TrieNode | undefined {
    return this.data.nodes.find((n) => n.path === path);
  }

  private clearTmp(): void {
    this.data.tmp = null;
  }

  insert(word: string): void {
    this.clearTmp();
    let cur = '';
    this.record(`insert '${word}'`);
    for (const ch of word) {
      cur += ch;
      let node = this.find(cur);
      if (!node) {
        node = {
          id: `t${this.data.counter++}`,
          path: cur,
          terminal: false,
          color: null,
          tag: '',
        };
        this.data.nodes.push(node);
        this.data.tmp = cur;
        this.record(`create node for '${ch}' (prefix '${cur}')`);
      } else {
        this.data.tmp = cur;
        this.record(`follow existing edge '${ch}' → '${cur}'`);
      }
    }
    const node = this.find(cur);
    if (node && !node.terminal) {
      node.terminal = true;
      this.data.tmp = cur;
      this.record(`'${word}' ends here — mark terminal`);
    }
    this.clearTmp();
  }

  search(word: string): boolean {
    this.clearTmp();
    let cur = '';
    for (const ch of word) {
      const next = cur + ch;
      const node = this.find(next);
      if (!node) {
        this.data.tmp = cur || '';
        this.record(`no edge for '${ch}' after '${cur}' — miss`);
        this.clearTmp();
        return false;
      }
      cur = next;
      this.data.tmp = cur;
      this.record(`follow '${ch}' → '${cur}'`);
    }
    const node = this.find(cur);
    if (node?.terminal) {
      node.color = 'found';
      this.data.tmp = null;
      this.record(`'${word}' found (terminal)`);
      this.clearTmp();
      return true;
    }
    this.record(`'${cur}' is only a prefix, not a word`);
    this.clearTmp();
    return false;
  }

  color(path: string, c: string | null, msg?: string): void {
    this.clearTmp();
    const node = this.find(path);
    if (node) node.color = c;
    this.record(msg ?? `color '${path || '(root)'}': ${c ?? 'none'}`);
  }

  tag(path: string, s: string, msg?: string): void {
    this.clearTmp();
    const node = this.find(path);
    if (!node) throw new Error(`no trie node for path '${path}'`);
    node.tag = s;
    this.record(msg ?? `'${path || '(root)'}' tag = ${s}`);
  }

  clearColors(msg?: string): void {
    this.clearTmp();
    for (const n of this.data.nodes) n.color = null;
    this.record(msg ?? 'clear colors');
  }
}
