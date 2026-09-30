import type { TrieData } from '@algoplot/core';
import { trieLayout } from './layout';
import { colorOf } from './palette';

const W = 640;
const H = 380;

export function TrieView({ data }: { data: TrieData }) {
  const pos = trieLayout(data.nodes);
  const byPath = new Map(pos.map((p) => [p.id, p]));
  const px = (v: number) => v * (W / 100);
  const py = (v: number) => v * (H / 100);

  return (
    <svg className="trie-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {data.nodes.map((n) => {
        if (n.path === '') return null;
        const p = byPath.get(n.path);
        const parent = byPath.get(n.path.slice(0, -1));
        if (!p || !parent) return null;
        const x1 = px(parent.x);
        const y1 = py(parent.y) + 13;
        const x2 = px(p.x);
        const y2 = py(p.y) - 13;
        const onPath = data.tmp !== null && n.path !== '' && data.tmp.startsWith(n.path);
        return (
          <g key={`e-${n.path}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: onPath ? colorOf('tmp') : 'var(--edge)' }} strokeWidth={onPath ? 3 : 2} />
            <text x={(x1 + x2) / 2 + 8} y={(y1 + y2) / 2} className="trie-edge-label">
              {n.path[n.path.length - 1]}
            </text>
          </g>
        );
      })}
      {data.nodes.map((n) => {
        const p = byPath.get(n.path);
        if (!p) return null;
        const x = px(p.x);
        const y = py(p.y);
        const onTmp = data.tmp !== null && data.tmp.startsWith(n.path) && n.path !== '';
        const c = onTmp ? colorOf('tmp') : colorOf(n.color);
        return (
          <g key={n.id}>
            <circle cx={x} cy={y} r={13} style={{ fill: c ?? 'var(--node-fill)', stroke: c ?? 'var(--node-stroke)' }} strokeWidth={2} />
            {n.terminal && <circle cx={x} cy={y} r={8} fill="none" stroke={c ?? 'var(--node-stroke)'} strokeWidth={1.5} />}
            {n.path === '' && <text x={x} y={y + 4} textAnchor="middle" className="node-label">∅</text>}
            {n.tag && (
              <text x={x} y={y + 26} textAnchor="middle" className="trie-tag">
                {n.tag}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
