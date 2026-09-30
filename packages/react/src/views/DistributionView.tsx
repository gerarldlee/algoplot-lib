import type { DistData } from '@algoplot/core';
import { colorOf } from './palette';

const W = 620;
const H = 320;

export function DistributionView({ data }: { data: DistData }) {
  const n = data.values.length;
  const max = Math.max(...data.values.map((v) => Math.abs(v)), 1e-9);
  const barW = (W - 40) / Math.max(1, n);
  const sum = data.values.reduce((a, b) => a + b, 0);
  return (
    <div className="dist-view">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <line x1={20} y1={H - 50} x2={W - 20} y2={H - 50} style={{ stroke: 'var(--edge)' }} strokeWidth={1.5} />
        {data.values.map((v, i) => {
          const h = (Math.abs(v) / max) * (H - 110);
          const x = 20 + i * barW + barW * 0.15;
          const w = barW * 0.7;
          const c = colorOf(data.colors[i]) ?? colorOf('focus');
          return (
            <g key={i}>
              <rect x={x} y={H - 50 - h} width={w} height={h} fill={c} rx={3} />
              <text x={x + w / 2} y={H - 50 - h - 8} textAnchor="middle" className="dist-value">
                {sum > 0 ? `${((v / sum) * 100).toFixed(1)}%` : v.toFixed(2)}
              </text>
              <text x={x + w / 2} y={H - 30} textAnchor="middle" className="dist-name">
                {data.names[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {data.evidence.length > 0 && (
        <div className="evidence-log">
          <div className="evidence-title">evidence</div>
          <ol>
            {data.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
