import type { SeqData } from '@algoplot/core';
import { colorOf } from './palette';

const LANE_W = 120;
const TOP = 64;
const ROW = 32;
const LEFT = 80;

const LANE_COLORS = ['focus', 'best', 'merged', 'pivot', 'visited', 'placed', 'right'];

export function SequenceView({ data }: { data: SeqData }) {
  const n = Math.max(1, data.lanes.length);
  const W = Math.max(480, LEFT * 2 + (n - 1) * LANE_W);
  const maxT = Math.max(0, data.t - 1, ...data.events.map((e) => e.t));
  const H = TOP + (maxT + 1) * ROW + 20;
  const x = (lane: number) => LEFT + lane * LANE_W;
  const rowY = (t: number) => TOP + t * ROW + ROW / 2;

  return (
    <svg className="seq-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {data.lanes.map((name, i) => (
        <g key={`h-${i}`}>
          <line
            x1={x(i)}
            y1={TOP - 6}
            x2={x(i)}
            y2={H - 8}
            stroke="var(--edge)"
            strokeWidth={1}
            strokeDasharray="4 5"
          />
          <rect
            x={x(i) - 52}
            y={8}
            width={104}
            height={30}
            rx={7}
            style={{ fill: 'var(--node-fill)', stroke: 'var(--node-stroke)' }}
            strokeWidth={1.5}
          />
          <text x={x(i)} y={27} textAnchor="middle" className="node-label">
            {name}
          </text>
        </g>
      ))}

      {data.locks.map((lk) => {
        const owner = lk.owner;
        const c = owner === null ? undefined : colorOf(LANE_COLORS[owner % LANE_COLORS.length]);
        const w = 14 + lk.name.length * 8;
        const cx = W / 2 - (data.locks.length * 90) / 2;
        const i = data.locks.indexOf(lk);
        return (
          <g key={lk.name}>
            <rect
              x={cx + i * 90}
              y={42}
              width={w}
              height={16}
              rx={8}
              fill={c ?? 'var(--bar-idle)'}
              opacity={c ? 1 : 0.6}
            />
            <text
              x={cx + i * 90 + w / 2}
              y={54}
              textAnchor="middle"
              className={owner === null ? 'seq-lock seq-lock-free' : 'seq-lock'}
            >
              {owner === null ? `${lk.name} · free` : `${lk.name} · ${data.lanes[owner]}`}
            </text>
          </g>
        );
      })}

      {data.events.map((e, i) => {
        if (e.k === 'msg') {
          const y = rowY(e.t);
          const x1 = x(e.from);
          const x2 = x(e.to);
          const dir = Math.sign(x2 - x1) || 1;
          const c = colorOf('focus')!;
          return (
            <g key={i}>
              <line x1={x1} y1={y} x2={x2 - 10 * dir} y2={y} stroke={c} strokeWidth={2} />
              <polygon
                points={`${x2},${y} ${x2 - 11 * dir},${y - 5} ${x2 - 11 * dir},${y + 5}`}
                fill={c}
              />
              <text x={(x1 + x2) / 2} y={y - 7} textAnchor="middle" className="seq-msg">
                {e.label}
              </text>
            </g>
          );
        }
        const y = rowY(e.t);
        const cx = x(e.lane);
        const c = colorOf(e.k === 'self' ? 'active' : 'visited')!;
        return (
          <g key={i}>
            <rect x={cx - 4} y={y - 9} width={8} height={18} rx={4} fill={c} />
            <rect x={cx + 12} y={y - 11} width={8 + e.label.length * 6.6} height={22} rx={6} fill={c} opacity={0.18} />
            <text x={cx + 19} y={y + 4} className="seq-act">
              {e.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
