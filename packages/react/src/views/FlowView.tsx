import type { FlowData } from '@algoplot/core';
import { colorOf } from './palette';

const BOX_W = 120;
const BOX_H = 62;
const COL_W = 158;
const ROW_H = 150;
const LEFT = 34;
const TOP = 40;
const PER_ROW = 4;

function posOf(i: number) {
  const col = i % PER_ROW;
  const row = Math.floor(i / PER_ROW);
  return { x: LEFT + col * COL_W, y: TOP + row * ROW_H };
}

export function FlowView({ data }: { data: FlowData }) {
  const n = Math.max(1, data.stages.length);
  const rows = Math.ceil(n / PER_ROW);
  const W = LEFT * 2 + PER_ROW * COL_W - (COL_W - BOX_W);
  const H = TOP + rows * ROW_H + 30;
  const center = (i: number) => {
    const p = posOf(i);
    return { cx: p.x + BOX_W / 2, cy: p.y + BOX_H / 2 };
  };
  const routeSet = new Set(data.route ?? []);

  return (
    <svg className="flow-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {data.edges.map((e, i) => {
        const a = center(e.u);
        const b = center(e.v);
        const onRoute = routeSet.has(e.u) && routeSet.has(e.v);
        return (
          <g key={`e${i}`}>
            <line
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              stroke={onRoute ? colorOf('path') : 'var(--edge)'}
              strokeWidth={onRoute ? 4 : 2}
              markerEnd={undefined}
            />
            <polygon
              points={`${b.cx},${b.cy} ${b.cx - 14},${b.cy - 5} ${b.cx - 14},${b.cy + 5}`}
              fill={onRoute ? colorOf('path') : 'var(--edge)'}
              transform={`rotate(${(Math.atan2(b.cy - a.cy, b.cx - a.cx) * 180) / Math.PI} ${b.cx} ${b.cy})`}
            />
          </g>
        );
      })}

      {data.tokens.map((tk, i) => {
        const e = data.edges[tk.e];
        const a = center(e.u);
        const b = center(e.v);
        const t = tk.pos;
        return (
          <circle
            key={`t${i}`}
            cx={a.cx + (b.cx - a.cx) * t}
            cy={a.cy + (b.cy - a.cy) * t}
            r={7}
            fill={colorOf(tk.c ?? 'focus')}
            stroke="var(--bg)"
            strokeWidth={2}
          />
        );
      })}

      {data.stages.map((s, i) => {
        const p = posOf(i);
        const cap = s.cap;
        const denom = cap ?? Math.max(4, s.q);
        const frac = Math.min(1, s.q / Math.max(1, denom));
        const over = cap !== null && s.q >= cap;
        const barC = over ? colorOf('reject') : colorOf('focus');
        return (
          <g key={s.id}>
            <rect
              x={p.x}
              y={p.y}
              width={BOX_W}
              height={BOX_H}
              rx={9}
              style={{ fill: 'var(--panel-2)', stroke: s.c ? undefined : 'var(--border)' }}
              stroke={s.c ? colorOf(s.c) : undefined}
              strokeWidth={s.c ? 2.5 : 1.5}
            />
            <text x={p.x + BOX_W / 2} y={p.y + 19} textAnchor="middle" className="flow-label">
              {s.label}
            </text>
            <rect x={p.x + 10} y={p.y + 38} width={BOX_W - 20} height={10} rx={5} fill="var(--bar-idle)" />
            <rect
              x={p.x + 10}
              y={p.y + 38}
              width={(BOX_W - 20) * frac}
              height={10}
              rx={5}
              fill={barC}
              opacity={0.9}
            />
            <text x={p.x + BOX_W - 10} y={p.y + 33} textAnchor="end" className="flow-q">
              {cap !== null ? `${s.q}/${cap}` : `q=${s.q}`}
            </text>
            {s.drops > 0 && (
              <g>
                <circle cx={p.x + BOX_W - 6} cy={p.y + 6} r={9} fill={colorOf('reject')} />
                <text x={p.x + BOX_W - 6} y={p.y + 10} textAnchor="middle" className="flow-drop">
                  {s.drops}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
