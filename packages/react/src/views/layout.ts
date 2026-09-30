import type { TreeNode } from '@algoplot/core';

export interface Pos {
  x: number;
  y: number;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

export function graphLayout(
  nodes: { id: string; x?: number; y?: number }[],
): LayoutNode[] {
  const allHaveCoords = nodes.length > 0 && nodes.every((n) => n.x !== undefined && n.y !== undefined);
  if (allHaveCoords) return nodes.map((n) => ({ id: n.id, x: n.x as number, y: n.y as number }));
  const r = 38;
  return nodes.map((n, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, nodes.length) - Math.PI / 2;
    return { id: n.id, x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
  });
}

export function treeLayout(
  nodes: Record<string, TreeNode>,
  root: string | null,
): LayoutNode[] {
  const order: string[] = [];
  const depth: Record<string, number> = {};
  const childrenOf = (n: TreeNode): (string | null)[] =>
    n.c ? n.c : [n.l, n.r];
  const walk = (id: string | null, d: number): void => {
    if (id === null || !(id in nodes)) return;
    const n = nodes[id];
    const kids = childrenOf(n);
    depth[id] = d;
    // in-order: first half of children, self, second half (binary → l, self, r)
    const mid = Math.ceil((kids.length - 1) / 2);
    for (let i = 0; i < mid; i++) walk(kids[i], d + 1);
    order.push(id);
    for (let i = mid; i < kids.length; i++) walk(kids[i], d + 1);
  };
  walk(root, 0);
  const count = order.length;
  const maxDepth = Math.max(0, ...order.map((id) => depth[id]));
  return order.map((id, i) => ({
    id,
    x: count === 1 ? 50 : 8 + (i * 84) / (count - 1),
    y: maxDepth === 0 ? 50 : 12 + (depth[id] * 76) / maxDepth,
  }));
}

interface TrieNodeLite {
  path: string;
}

export function trieLayout(nodes: TrieNodeLite[]): LayoutNode[] {
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const total = nodes.length;
  const pos: LayoutNode[] = [];
  let slot = 0;
  const walk = (path: string, depth: number): void => {
    const children = nodes
      .filter((n) => n.path.length === path.length + 1 && n.path.startsWith(path))
      .sort((a, b) => a.path.localeCompare(b.path));
    if (path !== '' || byPath.has(path)) {
      pos.push({
        id: path,
        x: ((slot + 0.5) * 100) / Math.max(1, total),
        y: depth === 0 ? 8 : 12 + depth * 17,
      });
      slot++;
    }
    for (const c of children) walk(c.path, depth + 1);
  };
  walk('', 0);
  return pos;
}

export function forestLayout(
  labels: string[],
  parent: Record<string, string | null>,
): LayoutNode[] {
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];
  for (const l of labels) {
    const p = parent[l];
    if (p === null || p === undefined) roots.push(l);
    else {
      if (!childrenOf.has(p)) childrenOf.set(p, []);
      childrenOf.get(p)!.push(l);
    }
  }
  const pos: LayoutNode[] = [];
  const depth: Record<string, number> = {};
  let slot = 0;
  const maxCount = labels.length;
  const walk = (id: string, d: number): void => {
    depth[id] = d;
    pos.push({ id, x: ((slot + 0.5) * 100) / Math.max(1, maxCount), y: d === 0 ? 12 : 14 + d * 26 });
    slot++;
    for (const c of childrenOf.get(id) ?? []) walk(c, d + 1);
  };
  for (const r of roots) walk(r, 0);
  return pos;
}
