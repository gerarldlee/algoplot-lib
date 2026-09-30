import type { GanttData } from '@algoplot/core';
import { colorOf } from './palette';

const W = 660;
const PAD_L = 76;
const PAD_R = 24;
const TOP = 34;
const ROW = 36;

export function GanttView({ data }: { data: GanttData }) {
  const rows = Math.max(1, data.rows.length);
  const H = TOP + rows * ROW + 30;
  const span = Math.max(1, data.horizon);
  const sx = (t: number) => PAD_L + (t / span) * (W - PAD_L - PAD_R);
  const ticks: number[] = [];
  const stepT = Math.max(1, Math.round(span / 8));
  for (let t = 0; t <= span; t += stepT) ticks.push(t);

  return (
    <svg className="gantt-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {data.rows.map((name, r) => (
        <g key={name}>
          <rect
            x={PAD_L}
            y={TOP + r * ROW}
            width={W - PAD_L - PAD_R}
            height={ROW - 4}
            fill={r % 2 === 0 ? 'var(--panel-2)' : 'transparent'}
            rx={4}
          />
          <text x={PAD_L - 8} y={TOP + r * ROW + ROW / 2 + 1} textAnchor="end" className="gantt-row">
            {name}
          </text>
        </g>
      ))}

      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} y1={TOP - 6} x2={sx(t)} y2={H - 24} stroke="var(--edge)" strokeDasharray="2 5" />
          <text x={sx(t)} y={H - 8} textAnchor="middle" className="gantt-tick">
            {t}
          </text>
        </g>
      ))}

      {data.bars.map((b, i) => {
        const x = sx(b.start);
        const w = Math.max(3, sx(b.end) - sx(b.start));
        const c = colorOf(b.c) ?? colorOf('focus')!;
        const showLabel = b.label !== undefined && w > 30;
        return (
          <g key={i}>
            <rect x={x} y={TOP + b.row * ROW + 4} width={w} height={ROW - 12} rx={5} fill={c} />
            {showLabel && (
              <text x={x + w / 2} y={TOP + b.row * ROW + ROW / 2 + 1} textAnchor="middle" className="gantt-bar-label">
                {b.label}
              </text>
            )}
          </g>
        );
      })}

      {data.marks.map((t) => (
        <g key={`m${t}`}>
          <line x1={sx(t)} y1={TOP - 10} x2={sx(t)} y2={H - 24} stroke={colorOf('active')} strokeWidth={2} />
          <polygon
            points={`${sx(t)},${TOP - 10} ${sx(t) - 5},${TOP - 18} ${sx(t) + 5},${TOP - 18}`}
            fill={colorOf('active')}
          />
        </g>
      ))}

      {data.cursor !== null && (
        <g>
          <line
            x1={sx(data.cursor)}
            y1={TOP - 14}
            x2={sx(data.cursor)}
            y2={H - 22}
            stroke={colorOf('focus')}
            strokeWidth={2}
          />
          <text x={sx(data.cursor)} y={TOP - 18} textAnchor="middle" className="gantt-cursor">
            {`t=${data.cursor}`}
          </text>
        </g>
      )}
    </svg>
  );
}
