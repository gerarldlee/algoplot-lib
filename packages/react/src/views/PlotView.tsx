import type { PlotData } from '@algoplot/core';
import { colorOf } from './palette';

const W = 660;
const H = 420;
const PAD = 52;

function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const span = max - min;
  const step = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step)));
  const norm = step / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const s = nice * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / s) * s; v <= max + s * 0.001; v += s) {
    ticks.push(Math.abs(v) < s * 1e-9 ? 0 : Number(v.toFixed(10)));
  }
  return ticks;
}

function fmtTick(v: number): string {
  if (v === 0) return '0';
  if (Number.isInteger(v) && Math.abs(v) < 1e6) return String(v);
  return v.toFixed(Math.abs(v) < 1 ? 2 : 1);
}

export function PlotView({ data }: { data: PlotData }) {
  const d = data.domain;
  const sx = (x: number) => PAD + ((x - d.xmin) / (d.xmax - d.xmin)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - d.ymin) / (d.ymax - d.ymin)) * (H - 2 * PAD);
  const xTicks = niceTicks(d.xmin, d.xmax);
  const yTicks = niceTicks(d.ymin, d.ymax);

  return (
    <svg className="plot-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <rect
        x={PAD}
        y={PAD}
        width={W - 2 * PAD}
        height={H - 2 * PAD}
        fill="none"
        stroke="var(--edge)"
        strokeWidth={1.2}
        rx={4}
      />
      {d.ymin <= 0 && d.ymax >= 0 && (
        <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="var(--edge)" strokeDasharray="3 4" strokeWidth={1} />
      )}
      {d.xmin <= 0 && d.xmax >= 0 && (
        <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="var(--edge)" strokeDasharray="3 4" strokeWidth={1} />
      )}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} y1={H - PAD} x2={sx(t)} y2={H - PAD + 5} stroke="var(--edge)" />
          <text x={sx(t)} y={H - PAD + 18} textAnchor="middle" className="plot-tick">
            {fmtTick(t)}
          </text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD - 5} y1={sy(t)} x2={PAD} y2={sy(t)} stroke="var(--edge)" />
          <text x={PAD - 9} y={sy(t) + 4} textAnchor="end" className="plot-tick">
            {fmtTick(t)}
          </text>
        </g>
      ))}

      {data.polys.map((p) => (
        <polyline
          key={p.id}
          points={p.pts.map(([px, py]) => `${sx(px)},${sy(py)}`).join(' ')}
          fill="none"
          stroke={colorOf(p.c) ?? 'var(--edge)'}
          strokeWidth={2.5}
          strokeDasharray={p.dash ? '6 5' : undefined}
        />
      ))}

      {data.trail.length > 1 && (
        <polyline
          points={data.trail.map(([px, py]) => `${sx(px)},${sy(py)}`).join(' ')}
          fill="none"
          stroke={colorOf('active')}
          strokeWidth={3}
          strokeDasharray="7 4"
        />
      )}
      {data.trail.map(([px, py], i) => (
        <circle key={i} cx={sx(px)} cy={sy(py)} r={3.5} fill={colorOf('active')} />
      ))}

      {data.circles.map((c, i) => (
        <circle
          key={i}
          cx={sx(c.x)}
          cy={sy(c.y)}
          r={c.r}
          fill={colorOf(c.c)}
          fillOpacity={0.12}
          stroke={colorOf(c.c)}
          strokeWidth={2}
          strokeDasharray="5 4"
        />
      ))}

      {data.points.map((p, i) => (
        <g key={i}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r={5.5} fill={colorOf(p.c) ?? 'var(--accent)'} />
          {p.label && (
            <text x={sx(p.x) + 9} y={sy(p.y) + 4} className="plot-pt-label">
              {p.label}
            </text>
          )}
        </g>
      ))}

      {data.texts.map((t, i) => (
        <text key={i} x={sx(t.x)} y={sy(t.y)} className="plot-text" style={t.c ? { fill: colorOf(t.c) } : undefined}>
          {t.s}
        </text>
      ))}
    </svg>
  );
}
