import type { UFData } from '@algoplot/core';
import { forestLayout } from './layout';
import { colorOf } from './palette';

const W = 600;
const H = 340;

export function ForestView({ data }: { data: UFData }) {
  const pos = forestLayout(data.labels, data.parent);
  const byId = new Map(pos.map((p) => [p.id, p]));
  const px = (v: number) => v * (W / 100);
  const py = (v: number) => v * (H / 100);

  return (
    <svg className="forest-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {data.labels.map((l) => {
        const p = data.parent[l];
        if (p === null || p === undefined) return null;
        const a = byId.get(p);
        const b = byId.get(l);
        if (!a || !b) return null;
        return (
          <line
            key={`e-${l}`}
            x1={px(a.x)}
            y1={py(a.y) + 15}
            x2={px(b.x)}
            y2={py(b.y) - 15}
            style={{ stroke: 'var(--link)' }}
            strokeWidth={2}
          />
        );
      })}
      {data.labels.map((l) => {
        const p = byId.get(l);
        if (!p) return null;
        const onPath = data.path.includes(l);
        const c = onPath ? colorOf('tmp') : colorOf(data.colors[l]);
        return (
          <g key={l}>
            <circle cx={px(p.x)} cy={py(p.y)} r={15} style={{ fill: c ?? 'var(--node-fill)', stroke: c ?? 'var(--node-stroke)' }} strokeWidth={2} />
            <text x={px(p.x)} y={py(p.y) + 4} textAnchor="middle" className="node-label">
              {l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
