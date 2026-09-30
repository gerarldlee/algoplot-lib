import type { NetData } from '@algoplot/core';
import { colorOf } from './palette';

const W = 660;
const H = 400;
const TOP = 64;

export function NetView({ data }: { data: NetData }) {
  const n = data.layers.length;
  if (n === 0) return <svg className="net-view" viewBox={`0 0 ${W} ${H}`} />;
  const lx = (i: number) => (n === 1 ? W / 2 : 70 + (i * (W - 140)) / (n - 1));
  const ny = (layerN: number, j: number) =>
    TOP + ((H - TOP - 40) * (j + 0.5)) / Math.max(1, layerN);

  const maxW = Math.max(
    0.001,
    ...Object.values(data.w).flatMap((m) => m.flatMap((row) => row.map(Math.abs))),
  );

  return (
    <svg className="net-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {data.layers.slice(0, -1).map((layer, i) => {
        const next = data.layers[i + 1];
        const m = data.w[layer.id];
        const flow = data.flow[layer.id];
        const mx = (lx(i) + lx(i + 1)) / 2;
        return (
          <g key={`f-${layer.id}`}>
            {m &&
              m.map((row, a) =>
                row.map((w, b) => {
                  const o = 0.12 + 0.75 * (Math.abs(w) / maxW);
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={lx(i)}
                      y1={ny(layer.n, a)}
                      x2={lx(i + 1)}
                      y2={ny(next.n, b)}
                      stroke={w >= 0 ? colorOf('focus') : colorOf('reject')}
                      strokeOpacity={o}
                      strokeWidth={1 + 2.5 * (Math.abs(w) / maxW)}
                    />
                  );
                }),
              )}
            <text
              x={mx}
              y={TOP - 34}
              textAnchor="middle"
              className="net-flow"
              style={{ fill: flow === 'fwd' ? colorOf('path') : flow === 'bwd' ? colorOf('active') : undefined }}
            >
              {flow === 'fwd' ? '▶ forward' : flow === 'bwd' ? '◀ backward' : ''}
            </text>
          </g>
        );
      })}

      {data.layers.map((layer, i) => (
        <g key={layer.id}>
          <text x={lx(i)} y={22} textAnchor="middle" className="net-head">
            {layer.label}
          </text>
          <text x={lx(i)} y={38} textAnchor="middle" className="net-sub">
            {layer.n} units
          </text>
          {Array.from({ length: layer.n }, (_, j) => {
            const a = data.act[layer.id]?.[j] ?? null;
            const intensity = a === null ? 0 : Math.min(1, Math.abs(a));
            const c = a !== null && a < 0 ? colorOf('reject') : colorOf('focus');
            return (
              <g key={j}>
                <circle
                  cx={lx(i)}
                  cy={ny(layer.n, j)}
                  r={13}
                  style={{ fill: 'var(--node-fill)', stroke: 'var(--node-stroke)' }}
                  strokeWidth={1.5}
                />
                {a !== null && (
                  <circle cx={lx(i)} cy={ny(layer.n, j)} r={9} fill={c} fillOpacity={0.15 + 0.85 * intensity} />
                )}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
