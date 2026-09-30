import type { Recorder } from '../recorder';
import { Struct } from './base';

export interface GraphNodeSpec {
  id: string;
  x?: number;
  y?: number;
}

export interface GraphSpec {
  nodes: (string | GraphNodeSpec)[];
  edges?: (string[] | [string, string] | [string, string, number])[];
  directed?: boolean;
  weighted?: boolean;
}

export type GraphData = {
  type: 'graph';
  directed: boolean;
  weighted: boolean;
  nodes: GraphNodeSpec[];
  edges: { u: string; v: string; w?: number }[];
  nodeColor: Record<string, string | null>;
  edgeColor: Record<string, string | null>;
  nodeLabel: Record<string, string>;
  edgeLabel: Record<string, string>;
  path: string[] | null;
  tmpNodes: string[];
  tmpEdges: string[];
}

export class VizGraph extends Struct {
  declare readonly data: GraphData;

  constructor(rec: Recorder, id: string, spec: GraphSpec) {
    const nodes: GraphNodeSpec[] = spec.nodes.map((n) => (typeof n === 'string' ? { id: n } : { ...n }));
    const edges = (spec.edges ?? []).map((e) => {
      const [u, v] = e;
      const w = e.length === 3 ? (e as [string, string, number])[2] : undefined;
      return w === undefined ? { u, v } : { u, v, w };
    });
    const nodeColor: Record<string, string | null> = {};
    const nodeLabel: Record<string, string> = {};
    for (const n of nodes) {
      nodeColor[n.id] = null;
      nodeLabel[n.id] = '';
    }
    const data: GraphData = {
      type: 'graph',
      directed: spec.directed ?? false,
      weighted: spec.weighted ?? edges.some((e) => e.w !== undefined),
      nodes,
      edges,
      nodeColor,
      edgeColor: {},
      nodeLabel,
      edgeLabel: {},
      path: null,
      tmpNodes: [],
      tmpEdges: [],
    };
    super(rec, id, data);
  }

  edgeKey(u: string, v: string): string {
    return this.data.directed ? `${u}\u2192${v}` : [u, v].sort().join('\u2013');
  }

  private clearTmp(): void {
    this.data.tmpNodes = [];
    this.data.tmpEdges = [];
  }

  /**
   * "No colour" is stored as null, never as undefined.
   *
   * `null` is how a colour is cleared, but Python's `None` crosses the bridge as
   * JavaScript `undefined` (see `bridge.py`), and `JSON.stringify` drops an undefined
   * value where it keeps an explicit null. A port would then produce a world missing
   * keys the JavaScript run has, and the parity check would fail on `undefined !== null`.
   * Coercing here keeps one representation on both sides.
   */
  private norm(c: string | null | undefined): string | null {
    return c ?? null;
  }

  hasNode(id: string): boolean {
    return this.data.nodes.some((n) => n.id === id);
  }

  colorNode(n: string, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.nodeColor[n] = this.norm(c);
    this.record(msg ?? `color node ${n}: ${c ?? 'none'}`);
  }

  colorNodes(ns: string[], c: string | null, msg?: string): void {
    this.clearTmp();
    for (const n of ns) this.data.nodeColor[n] = this.norm(c);
    this.record(msg ?? `color ${ns.join(', ')}: ${c ?? 'none'}`);
  }

  colorEdge(u: string, v: string, c: string | null, msg?: string): void {
    this.clearTmp();
    this.data.edgeColor[this.edgeKey(u, v)] = this.norm(c);
    this.record(msg ?? `color edge ${u}-${v}: ${c ?? 'none'}`);
  }

  visit(n: string, msg?: string): void {
    this.colorNode(n, 'visited', msg ?? `visited ${n}`);
  }

  frontier(n: string, msg?: string): void {
    this.colorNode(n, 'frontier', msg ?? `add ${n} to frontier`);
  }

  focus(nodes: string | string[], msg?: string): void {
    this.clearTmp();
    this.data.tmpNodes = Array.isArray(nodes) ? nodes : [nodes];
    this.record(msg ?? `at ${this.data.tmpNodes.join(', ')}`);
  }

  relax(u: string, v: string, msg?: string): void {
    this.clearTmp();
    this.data.tmpNodes = [u, v];
    this.data.tmpEdges = [this.edgeKey(u, v)];
    this.record(msg ?? `relax edge ${u}-${v}`);
  }

  label(n: string, s: string, msg?: string): void {
    this.clearTmp();
    this.data.nodeLabel[n] = s;
    this.record(msg ?? `label ${n} = ${s}`);
  }

  labelEdge(u: string, v: string, s: string, msg?: string): void {
    this.clearTmp();
    this.data.edgeLabel[this.edgeKey(u, v)] = s;
    this.record(msg ?? `edge ${u}-${v} label = ${s}`);
  }

  clearEdgeLabels(msg?: string): void {
    this.clearTmp();
    this.data.edgeLabel = {};
    this.record(msg ?? 'clear edge labels');
  }

  setPath(nodes: string[] | null, msg?: string): void {
    this.clearTmp();
    this.data.path = nodes;
    this.record(msg ?? (nodes ? `path: ${nodes.join(' → ')}` : 'clear path'));
  }

  addNode(id: string, x?: number, y?: number, msg?: string): void {
    this.clearTmp();
    if (this.hasNode(id)) return;
    this.data.nodes.push(x === undefined || y === undefined ? { id } : { id, x, y });
    this.data.nodeColor[id] = null;
    this.data.nodeLabel[id] = '';
    this.record(msg ?? `add node ${id}`);
  }

  addEdge(u: string, v: string, w?: number, msg?: string): void {
    this.clearTmp();
    this.data.edges.push(w === undefined ? { u, v } : { u, v, w });
    this.record(msg ?? `add edge ${u}-${v}${w === undefined ? '' : ` (${w})`}`);
  }

  nodeIndex(id: string): number {
    return this.data.nodes.findIndex((n) => n.id === id);
  }
}
