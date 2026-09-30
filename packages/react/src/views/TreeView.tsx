import type { TreeData } from '@algoplot/core';
import { treeLayout } from './layout';
import { colorOf } from './palette';

const W = 640;
const H = 380;

export function TreeView({ data }: { data: TreeData }) {
  const pos = treeLayout(data.nodes, data.root);
  const byId = new Map(pos.map((p) => [p.id, p]));
  const edges: { from: string; to: string }[] = [];
  for (const [id, n] of Object.entries(data.nodes)) {
    if (n.c) {
      for (const c of n.c) {
        if (c !== null) edges.push({ from: id, to: c });
      }
    } else {
      if (n.l !== null) edges.push({ from: id, to: n.l });
      if (n.r !== null) edges.push({ from: id, to: n.r });
    }
  }
  const px = (v: number) => v * (W / 100);
  const py = (v: number) => v * (H / 100);

  return (
    <svg className="tree-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {edges.map((e) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        const x1 = px(a.x);
        const y1 = py(a.y) + 15;
        const x2 = px(b.x);
        const y2 = py(b.y) - 15;
        const midY = (y1 + y2) / 2;
        return (
          <path
            key={`${e.from}-${e.to}`}
            d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
            className="tree-link"
          />
        );
      })}
      {Object.keys(data.nodes).map((id) => {
        const p = byId.get(id);
        if (!p) return null;
        const x = px(p.x);
        const y = py(p.y);
        const isTmp = data.tmp.includes(id);
        const c = isTmp ? colorOf('tmp') : colorOf(data.colors[id]);
        const n = data.nodes[id];
        const keys = n.keys;
        const annot = data.annot[id];
        return (
          <g key={id}>
            {keys ? (
              <g>
                <rect
                  x={x - (keys.length * 34 + 6) / 2}
                  y={y - 15}
                  width={keys.length * 34 + 6}
                  height={30}
                  rx={7}
                  style={{ fill: c ?? 'var(--node-fill)', stroke: c ?? 'var(--node-stroke)' }}
                  strokeWidth={2}
                />
                {keys.map((k, i) => (
                  <g key={i}>
                    {i > 0 && (
                      <line
                        x1={x - (keys.length * 34) / 2 + i * 34}
                        y1={y - 13}
                        x2={x - (keys.length * 34) / 2 + i * 34}
                        y2={y + 13}
                        stroke="var(--node-stroke)"
                      />
                    )}
                    <text
                      x={x - (keys.length * 34) / 2 + i * 34 + 17}
                      y={y + 4}
                      textAnchor="middle"
                      className="node-label"
                    >
                      {String(k)}
                    </text>
                  </g>
                ))}
              </g>
            ) : (
              <circle
                cx={x}
                cy={y}
                r={15}
                style={{ fill: c ?? 'var(--node-fill)', stroke: c ?? 'var(--node-stroke)' }}
                strokeWidth={2}
              />
            )}
            {!keys && (
              <text x={x} y={y + 4} textAnchor="middle" className="node-label">
                {String(n.v)}
              </text>
            )}
            {annot && (
              <text x={x} y={y + (keys ? 30 : 28)} textAnchor="middle" className="tree-annot">
                {annot}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
